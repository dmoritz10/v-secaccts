import { currUser } from "./global";
import { db } from "./firebase";
import {
  collection,
  query,
  getDocs,
  where,
  updateDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore";

function clearUser(usr) {
  Object.keys(usr).forEach((key) => {
    delete usr[key];
  });
}
async function getCats() {
  const q = query(collection(db, "categories"), orderBy("name", "asc"));
  const getCats = await getDocs(q);
  const cats = getCats.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return cats;
}

async function getAccts() {
  const getAccts = await getDocs(collection(db, "accounts"));
  // const accts = getAccts.docs.map((doc) => doc.data());
  // const ids = getAccts.docs.map((doc) => ({ id: doc.id }));
  // return { accts: accts, ids: ids };
  const accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return accts;
}

async function getUser(userName) {
  try {
    const users = collection(db, "users");
    const q = query(users, where("name", "==", userName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }
    const userDoc = snapshot.docs[0].data(); // Get first matching document
    return userDoc;
  } catch (error) {
    console.log("getUser error", error);
    return null;
  }
}

async function getOption(keyValue) {
  console.log("db", db);
  try {
    const options = collection(db, "options");
    console.log("options", options);
    const q = query(options, where("key", "==", keyValue));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const optionDoc = querySnapshot.docs[0].data(); // Get first matching document

    return optionDoc.value;
  } catch (error) {
    console.log("getOptions error: ", error);
    return null;
  }
}

async function updateOption(key, val) {
  if (typeof val === "object") {
    var strVal = JSON.stringify(val);
  } else {
    var strVal = val;
  }

  try {
    const options = collection(db, "options");
    const q = query(options, where("key", "==", key));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const optionId = querySnapshot.docs[0].id; // Get first matching document
    const updateRef = doc(db, "options", optionId);
    await updateDoc(updateRef, { value: strVal });
  } catch (error) {
    return null;
  }
}

async function encyptCat(cat, pwd = currUser.pwd, called = false) {
  console.log("encryptCat", pwd);
  console.time("encryptCat");

  if (cat.enc) {
    toast(`Category ${cat.name} is already encrypted`, 0);
    return;
  }

  if (!called) modal(true);

  const ref = doc(db, "categories", cat.id);
  const col = collection(db, "accounts");
  const q = query(col, where("categoryId", "==", ref));
  const getAccts = await getDocs(q);

  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const decAccts = accts.filter((acct) => !acct.enc);

  if (!decAccts.length) {
    toast(`Category ${cat.name} has no decrypted accounts`, 0);
    if (!called) modal(false);
    return;
  }

  toast(`Encrypting ${cat.name}`, 5000);

  let encArr = await encryptAccts(decAccts);

  const bUpd = await updateAccts(encArr, true, true);

  await updateDoc(doc(db, "categories", cat.id), { enc: true });

  toast("Encryption complete", 0);

  if (!called) modal(false);

  await loadAccounts();

  console.log("encryptCat:", accts.length);
  console.timeEnd("encryptCat");
}

async function decyptCat(cat, pwd = currUser.pwd, called = false) {
  console.time("decryptCat");
  console.log("decryptCat");

  if (!cat.enc) {
    toast(`Category ${cat.name} is already decrypted`, 0);
    return;
  }

  const confirmOK = await confirm(
    "Warning !  Decrypting sheet can expose passwords and other sensitive data to others with access to your account."
  );
  if (!confirmOK) {
    toast("Decryption cancelled", 0);
    return null;
  }

  if (!called) modal(true);
  const ref = doc(db, "categories", cat.id);
  const col = collection(db, "accounts");
  const q = query(col, where("categoryId", "==", ref));
  const getAccts = await getDocs(q);

  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);

  if (!encAccts.length) {
    toast(`Category ${cat.name} has no encrypted accounts`, 0);
    if (!called) modal(false);
    return;
  }

  toast(`Decrypting ${cat.name}`, 0);

  let encArr = await decryptAccts(encAccts);

  const bUpd = await updateAccts(encArr, false, true);

  toast("Decryption complete", 0);

  if (!called) modal(false);

  await updateDoc(doc(db, "categories", cat.id), { enc: false });

  await loadAccounts();

  console.log("decryptCat:", accts.length);
  console.timeEnd("decryptCat");
}

async function encryptAccts(accts, pwd = currUser.pwd) {
  console.time("encryptAccts", pwd);

  try {
    // Initialize result array with same structure
    const result = accts.map((obj) => ({ ...obj }));

    // Create promises only for key-value pairs where key is in acctEncFlds
    const encryptionPromises = accts.flatMap((obj, objIndex) =>
      Object.entries(obj)
        // .filter(([key, value]) => acctEncFlds.includes(key) && value !== null)
        .filter(([key, value]) => acctEncFlds.includes(key))
        .map(([key, value]) =>
          encryptMessage(value, pwd).then((encrypted) => ({
            objIndex,
            key,
            encrypted,
          }))
        )
    );

    // Process all encryption promises
    const encryptedResults = await Promise.all(encryptionPromises);

    // Update the result array with encrypted values
    encryptedResults.forEach(({ objIndex, key, encrypted }) => {
      result[objIndex][key] = encrypted;
    });

    console.log("encryptAccts:", encryptionPromises.length);
    console.timeEnd("encryptAccts");

    return result;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

async function decryptAccts(accts, pwd = currUser.pwd) {
  console.time("decryptAccts");

  try {
    // Initialize result array with same structure
    const result = accts.map((obj) => ({ ...obj }));

    // Create promises only for key-value pairs where key is in acctEncFlds
    const decryptionPromises = accts.flatMap((obj, objIndex) =>
      Object.entries(obj)
        // .filter(([key, value]) => acctEncFlds.includes(key) && value !== null)
        .filter(([key, value]) => acctEncFlds.includes(key))
        .map(([key, value]) =>
          decryptMessage(value, pwd).then((decrypted) => ({
            objIndex,
            key,
            decrypted,
          }))
        )
    );

    // Process all decryption promises
    const decryptedResults = await Promise.all(decryptionPromises);

    // Update the result array with decrypted values
    decryptedResults.forEach(({ objIndex, key, decrypted }) => {
      result[objIndex][key] = decrypted;
    });
    console.log("decryptAccts:", decryptionPromises.length);
    console.timeEnd("decryptAccts");

    return result;
  } catch (error) {
    throw new Error(`decryption failed: ${error.message}`);
  }
}

async function updateAccts(accts, enc, disableOnSnapshot = false) {
  console.time("updateAccts");

  if (disableOnSnapshot) unsubscribeAccts();

  const batch = writeBatch(db);

  for (let i = 0; i < accts.length; i++) {
    let acct = accts[i];
    const { id, ...acctNoId } = acct; // Removes 'id' and creates a new object
    const docRef = doc(db, "accounts", acct.id);
    // acct["lastChange"] = new Date();
    acctNoId["enc"] = enc;
    batch.update(docRef, acctNoId);
  }

  await batch
    .commit()
    .then((result) => {
      console.log("updateAccts: ", accts.length);
      console.timeEnd("updateAccts");
      console.log("Batch update successful!");

      return result;
    })
    .catch((error) => {
      console.error("Batch update failed: ", error);

      return error;
    });

  if (disableOnSnapshot) initializeAcctsSnapshot();
}

export {
  getCats,
  getAccts,
  getUser,
  getOption,
  updateOption,
  encyptCat,
  decyptCat,
  encryptAccts,
  decryptAccts,
  updateAccts,
  clearUser,
};
