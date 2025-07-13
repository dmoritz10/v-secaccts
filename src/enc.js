async function encryptArr(msg, pwd = currUser.pwd) {
  var rtn = [];

  if (is2dArray(msg)) {
    for (var i = 0; i < msg.length; i++) {
      var r = msg[i];
      var row = [];
      for (var j = 0; j < r.length; j++) {
        var m = await encryptMessage(r[j], pwd);
        row.push(m);
      }
      rtn.push(row);
    }
  } else {
    for (var i = 0; i < msg.length; i++) {
      var m = await encryptMessage(msg[i], pwd);
      rtn.push(m);
    }
  }

  return rtn;
}

async function decryptArr(msg, pwd = currUser.pwd) {
  var rtn = [];

  if (is2dArray(msg)) {
    for (var i = 0; i < msg.length; i++) {
      var r = msg[i];
      var row = [];
      for (var j = 0; j < r.length; j++) {
        var m = await decryptMessage(r[j], pwd);
        row.push(m);
      }
      rtn.push(row);
    }
  } else {
    for (var i = 0; i < msg.length; i++) {
      var m = await decryptMessage(msg[i], pwd);
      rtn.push(m);
    }
  }

  return rtn;
}

async function decryptMessageArr(input) {
  // Flatten input if it's an array of arrays
  const messages = Array.isArray(input[0]) ? input.flat() : input;
  // Validate input
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Input must be a non-empty array or array of arrays");
  }

  // Use Promise.all to encrypt all messages concurrently
  try {
    const encryptedMessages = await Promise.all(
      messages.map(async (message) => {
        if (typeof message !== "string") {
          throw new Error("All messages must be strings");
        }
        return await decryptMessage(message);
      })
    );
    return encryptedMessages;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// async function encryptMessageCDC(msg, password = currUser.pwd) {
//   if (msg === null) return null;

//   const encoder = new TextEncoder();

//   const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

//   const PBKDF2 = async (password, salt, iterations, length, hash, algorithm = "AES-CBC") => {
//     keyMaterial = await window.crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);

//     return await window.crypto.subtle.deriveKey(
//       {
//         name: "PBKDF2",
//         salt: encoder.encode(salt),
//         iterations,
//         hash,
//       },
//       keyMaterial,
//       { name: algorithm, length },
//       false, // we don't need to export our key!!!
//       ["encrypt", "decrypt"]
//     );
//   };

//   const salt = window.crypto.getRandomValues(new Uint8Array(16));
//   const iv = window.crypto.getRandomValues(new Uint8Array(16));
//   const plain_text = encoder.encode(msg);
//   const key = await PBKDF2(password, salt, 100000, 256, "SHA-256");

//   const encrypted = await window.crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, plain_text);

//   var ciphertext = toBase64([...salt, ...iv, ...new Uint8Array(encrypted)]);

//   return ciphertext;
// }

// async function decryptMessageCDC(ciphertext, password = currUser.pwd) {
//   if (ciphertext === null) return null;
//   const encoder = new TextEncoder();
//   const decoder = new TextDecoder();

//   var fromBase64 = (buffer) => Uint8Array.from(atob(buffer), (c) => c.charCodeAt(0));

//   const PBKDF2 = async (password, salt, iterations, length, hash, algorithm = "AES-CBC") => {
//     const keyMaterial = await window.crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
//     return await window.crypto.subtle.deriveKey(
//       {
//         name: "PBKDF2",
//         salt: encoder.encode(salt),
//         iterations,
//         hash,
//       },
//       keyMaterial,
//       { name: algorithm, length },
//       false, // we don't need to export our key!!!
//       ["encrypt", "decrypt"]
//     );
//   };

//   const salt_len = (iv_len = 16);

//   const encrypted = fromBase64(ciphertext);

//   const salt = encrypted.slice(0, salt_len);
//   const iv = encrypted.slice(0 + salt_len, salt_len + iv_len);
//   const key = await PBKDF2(password, salt, 100000, 256, "SHA-256");

//   const decrypted = await window.crypto.subtle
//     .decrypt({ name: "AES-CBC", iv }, key, encrypted.slice(salt_len + iv_len))
//     .then(function (decrypted) {
//       // console.log('deecrypted', decoder.decode(decrypted));
//       return decoder.decode(decrypted);
//     })
//     .catch(function (err) {
//       console.log(err);

//       // console.error(err);
//       return err.toString();
//     });

//   return decrypted;
// }

async function encryptMessage(msg, password = currUser.pwd) {
  if (msg === null) return null;

  const encoder = new TextEncoder();
  const toBase64 = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const PBKDF2 = async (
    password,
    salt,
    iterations,
    length,
    hash,
    algorithm = "AES-GCM"
  ) => {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations,
        hash,
      },
      keyMaterial,
      { name: algorithm, length },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
  const plain_text = encoder.encode(msg);
  const key = await PBKDF2(password, toBase64(salt), 100000, 256, "SHA-256");

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain_text
  );

  // Concatenate salt (16 bytes), iv (12 bytes), and ciphertext+tag
  const concatenated = new Uint8Array([
    ...salt,
    ...iv,
    ...new Uint8Array(encrypted),
  ]);
  return toBase64(concatenated);
}

async function decryptMessage(ciphertextBase64, password = currUser.pwd) {
  if (ciphertextBase64 === null) return null;

  // if (!ciphertextBase64) {
  //   throw new Error("Missing ciphertext");
  // }

  const encoder = new TextEncoder();
  const toBase64 = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const fromBase64 = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const PBKDF2 = async (
    password,
    salt,
    iterations,
    length,
    hash,
    algorithm = "AES-GCM"
  ) => {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations,
        hash,
      },
      keyMaterial,
      { name: algorithm, length },
      false,
      ["encrypt", "decrypt"]
    );
  };

  // Decode concatenated base64 string
  const concatenated = new Uint8Array(await fromBase64(ciphertextBase64));
  if (concatenated.length < 28) {
    // Minimum: 16 (salt) + 12 (iv)
    throw new Error("Invalid ciphertext format");
  }

  // Split into salt, iv, and ciphertext
  const salt = concatenated.slice(0, 16);
  const iv = concatenated.slice(16, 28);
  const ciphertext = concatenated.slice(28);

  // Derive key using base64-encoded salt
  const key = await PBKDF2(password, toBase64(salt), 100000, 256, "SHA-256");

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error("Decryption failed: Invalid password or tampered data");
  }
}

export {
  encryptArr,
  decryptArr,
  decryptMessageArr,
  encryptMessage,
  decryptMessage,
};
