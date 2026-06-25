import { updateOption } from '@/services/common';
import { getKey } from '@/services/keyVault';

// Derive key from password + salt
async function deriveKey(password, saltBase64) {
  const textEncoder = new TextEncoder();
  const base64ToBytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
}

async function buildVerifierData(password) {
  const textEncoder = new TextEncoder();
  const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(salt);

  const key = await deriveKey(password, saltBase64);

  const verifierString = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(verifierString));

  return {
    salt: saltBase64,
    verifier: {
      iv: bytesToBase64(iv),
      data: bytesToBase64(encrypted),
    },
    key, // exposed so callers don't have to re-derive it
  };
}

async function encryptMessage(plaintext) {
  if (!plaintext) return null;

  const textEncoder = new TextEncoder();
  const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  let key = getKey();

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext));

  // Compact: store IV + ciphertext as base64
  const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return bytesToBase64(combined);
}

async function decryptMessage(ciphertextBase64) {
  if (!ciphertextBase64) return null;

  const textDecoder = new TextDecoder();
  const base64ToBytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  let key = getKey();

  const combined = base64ToBytes(ciphertextBase64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return textDecoder.decode(decrypted);
}

async function encryptBlob(blob) {
  const key = getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plainBuffer = await blob.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBuffer);

  // Prepend IV to ciphertext, store as one blob
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return new Blob([combined], { type: 'application/octet-stream' });
}

async function decryptBlob(encryptedBlob, originalMimeType) {
  const key = getKey();
  const buffer = await encryptedBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Blob([decrypted], { type: originalMimeType });
}

/* ----------------------------------------
   4️⃣ Verify password and return key
---------------------------------------- */
async function verifyPassword(password, stored) {
  const textDecoder = new TextDecoder();

  const base64ToBytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { salt, verifier } = stored; // verifier: { data, iv }

  const key = await deriveKey(password, salt);

  try {
    // Try decrypting
    const decryptedVerifier = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(verifier.iv) },
      key,
      base64ToBytes(verifier.data)
    );

    // If we reach this point without throwing, password is correct.
    // (Optional sanity check: decode the plaintext just to log it)
    const text = textDecoder.decode(decryptedVerifier);

    return key; // derived AES key to use for encryption/decryption
  } catch (e) {
    return null;
  }
}
export { encryptMessage, decryptMessage, buildVerifierData, verifyPassword, deriveKey, encryptBlob, decryptBlob };
