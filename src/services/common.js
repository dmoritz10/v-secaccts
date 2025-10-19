import { db } from "@/firebase";
import {
  collection,
  doc,
  query,
  getDocs,
  getDoc,
  where,
  updateDoc,
  addDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import { toast, alertDialog, confirmDialog, blockScreen, unblockScreen } from "@/ui/dialogState.js";
import { encryptMessage, decryptMessage } from "@/services/enc";
import Accounts from "@/views/Accounts.vue";

export const acctEncFlds = [
  "accountNbr",
  "autoPay",
  "login",
  "loginUrl",
  "notes",
  "password",
  "pinNbr",
  "securityQA",
  "lastChange",
];

export const acctDBFlds = [
  "provider",
  "categoryId",
  "enc",
  "favorite",
  "accountNbr",
  "autoPay",
  "login",
  "loginUrl",
  "notes",
  "password",
  "pinNbr",
  "securityQA",
  "lastChange",
];

async function getCats() {
  //not used
  const q = query(collection(db, "categories"), orderBy("name", "asc"));
  const getCats = await getDocs(q);
  const cats = getCats.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return cats;
}

async function getAccts() {
  // used
  const getAccts = await getDocs(collection(db, "accounts"));
  const accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return accts;
}

async function getUser(uid) {
  // used
  try {
    const docRef = doc(db, "users", uid);
    const snapshot = await getDoc(docRef);

    if (snapshot.empty) {
      return null;
    }
    const userDoc = snapshot.data(); // Get first matching document
    return userDoc;
  } catch (error) {
    console.log("getUser error", error);
    return null;
  }
}

async function getOption(keyValue) {
  // used
  try {
    const options = collection(db, "options");
    const q = query(options, where("key", "==", keyValue));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const optionDoc = querySnapshot.docs[0].data(); // Get first matching document

    return optionDoc.value;
  } catch (error) {
    console.log("getOptions error: ", error);
    alertDialog("getOptions error", error);

    return null;
  }
}

async function updateOption(key, val) {
  try {
    const options = collection(db, "options");
    const q = query(options, where("key", "==", key));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(collection(db, "options"), { key: key, value: val });
    } else {
      const optionId = querySnapshot.docs[0].id; // Get first matching document
      const updateRef = doc(db, "options", optionId);
      await updateDoc(updateRef, { value: val });
    }
  } catch (error) {
    alertDialog("Error updating Options", error);
    return null;
  }
}

async function encryptCat(cat) {
  // used
  console.log("encryptCat");

  blockScreen();

  const ref = doc(db, "categories", cat.id);
  const col = collection(db, "accounts");
  const q = query(col, where("categoryId", "==", cat.id));
  const getAccts = await getDocs(q);
  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const decAccts = accts.filter((acct) => !acct.enc);

  if (!decAccts.length) {
    alertDialog("Encrypt Category", `Category ${cat.name} has no decrypted accounts`);
    updateDoc(doc(db, "categories", cat.id), { enc: true });
    unblockScreen();
    return;
  }

  toast(`Encrypting ${cat.name}`, 5000);

  let encArr = await encryptAccts(decAccts);

  const bUpd = await updateAccts(encArr, true, true);

  await updateDoc(doc(db, "categories", cat.id), { enc: true });

  toast("Encryption complete", 0);

  unblockScreen();

  console.timeEnd("encryptCat");
}

async function decryptCat(cat) {
  // used
  // console.time("decryptCat");
  const confirmOK = await confirmDialog(
    "<strong class='text-red'>Warning !",
    "Decrypting sheet can expose passwords and other sensitive data to others with access to your account.<br><br>Do you wish to continue ?"
  );
  if (!confirmOK) {
    toast("Decryption cancelled", 0);
    unblockScreen();
    return null;
  }
  blockScreen("Decryption underway");

  const col = collection(db, "accounts");
  const q = query(col, where("categoryId", "==", cat.id));
  const getAccts = await getDocs(q);

  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);
  if (!encAccts.length) {
    alertDialog("Decrypt Category", `Category ${cat.name} has no encrypted accounts`);
    updateDoc(doc(db, "categories", cat.id), { enc: false });
    unblockScreen();
    return;
  }

  toast(`Decrypting ${cat.name}`, 0);

  let encArr = await decryptAccts(encAccts);

  const bUpd = await updateAccts(encArr, false, true);

  await updateDoc(doc(db, "categories", cat.id), { enc: false });

  toast("Decryption complete", 0);

  unblockScreen();

  console.log("decryptCat:", accts.length);
  console.timeEnd("decryptCat");
}

async function encryptAccts(accts) {
  // used
  console.log("encryptAccts");

  try {
    // Initialize result array with same structure
    const result = accts.map((obj) => ({ ...obj }));

    // Create promises only for key-value pairs where key is in acctEncFlds
    const encryptionPromises = accts.flatMap((obj, objIndex) =>
      Object.entries(obj)
        // .filter(([key, value]) => acctEncFlds.includes(key) && value !== null)
        .filter(([key, value]) => acctEncFlds.includes(key))
        .map(([key, value]) =>
          encryptMessage(value).then((encrypted) => ({
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
    console.log(`Encryption failed: ${error.message}`);
  }
}

async function decryptAcctReactive(acct) {
  //used
  // console.log("decryptAcctReactive", Accounts);
  // console.trace("Change stack trace:");
  for (const key in acct) {
    if (acctEncFlds.indexOf(key) > -1) {
      acct[key] = await decryptMessage(acct[key]); // ✅ mutate property, reactivity preserved
    }
  }
}

async function decryptAccts(accts) {
  //used
  console.log("decryptAccts");

  try {
    // Initialize result array with same structure
    const result = accts.map((obj) => ({ ...obj }));

    // Create promises only for key-value pairs where key is in acctEncFlds
    const decryptionPromises = accts.flatMap((obj, objIndex) =>
      Object.entries(obj)
        // .filter(([key, value]) => acctEncFlds.includes(key) && value !== null)
        .filter(([key, value]) => acctEncFlds.includes(key))
        .map(([key, value]) =>
          decryptMessage(value).then((decrypted) => ({
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

    return result;
  } catch (error) {
    alertDialog("Decryption failed", error);
    throw new Error(`decryption failed: ${error.message}`);
  }
}

async function updateAccts(accts, enc, disableOnSnapshot = false) {
  //used
  console.time("updateAccts");

  // if (disableOnSnapshot) unsubscribeAccts();

  const batch = writeBatch(db);

  for (let i = 0; i < accts.length; i++) {
    let acct = accts[i];
    const { id, ...acctNoId } = acct; // Removes 'id' and creates a new object
    const docRef = doc(db, "accounts", acct.id);
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
      alertDialog("Batch update failed", error);
      return error;
    });

  // if (disableOnSnapshot) initializeAcctsSnapshot();
}

export {
  getCats,
  getAccts,
  getUser,
  getOption,
  updateOption,
  encryptCat,
  decryptCat,
  encryptAccts,
  decryptAccts,
  updateAccts,
  decryptAcctReactive,
};
