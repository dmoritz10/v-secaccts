import { db } from '@/firebase';
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
} from 'firebase/firestore';
import { toast, alertDialog, confirmDialog, blockScreen, unblockScreen } from '@/ui/dialogState.js';
import { encryptMessage, decryptMessage } from '@/services/enc';
import { useCategoryStore } from '@/stores/category';
import Accounts from '@/views/Accounts.vue';

export const acctEncFlds = ['accountNbr', 'autoPay', 'login', 'loginUrl', 'notes', 'password', 'pinNbr', 'securityQA'];

export const acctDBFlds = [
  'provider',
  'categoryId',
  'enc',
  'favorite',
  'accountNbr',
  'autoPay',
  'login',
  'loginUrl',
  'notes',
  'password',
  'pinNbr',
  'securityQA',
  'lastChange',
];

async function getCats() {
  //not used
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  const getCats = await getDocs(q);
  const cats = getCats.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return cats;
}

async function getAccts() {
  // used
  const getAccts = await getDocs(collection(db, 'accounts'));
  const accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return accts;
}

async function getUser(uid) {
  // used
  try {
    const docRef = doc(db, 'users', uid);
    const snapshot = await getDoc(docRef);

    if (snapshot.empty) {
      return null;
    }
    const userDoc = snapshot.data(); // Get first matching document
    return userDoc;
  } catch (error) {
    console.log('getUser error', error);
    return null;
  }
}

async function getOption(keyValue) {
  // used
  try {
    const options = collection(db, 'options');
    const q = query(options, where('key', '==', keyValue));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const optionDoc = querySnapshot.docs[0].data(); // Get first matching document

    return optionDoc.value;
  } catch (error) {
    console.log('getOptions error: ', error);
    alertDialog('getOptions error', error);

    return null;
  }
}

async function updateOption(key, val) {
  try {
    const options = collection(db, 'options');
    const q = query(options, where('key', '==', key));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(collection(db, 'options'), { key: key, value: val });
    } else {
      const optionId = querySnapshot.docs[0].id; // Get first matching document
      const updateRef = doc(db, 'options', optionId);
      await updateDoc(updateRef, { value: val });
    }
  } catch (error) {
    alertDialog('Error updating Options', error);
    return null;
  }
}

async function encryptCat(cat) {
  // used
  console.log('encryptCat');

  // blockScreen();

  const ref = doc(db, 'categories', cat.id);
  const col = collection(db, 'accounts');
  const q = query(col, where('categoryId', '==', cat.id));
  const getAccts = await getDocs(q);
  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const decAccts = accts.filter((acct) => !acct.enc);

  if (!decAccts.length) {
    alertDialog('Encrypt Category', `Category ${cat.name} has no decrypted accounts`);
    updateDoc(doc(db, 'categories', cat.id), { enc: true });
    unblockScreen();
    return;
  }

  toast(`Encrypting ${cat.name}`, 5000);

  await updateDoc(doc(db, 'categories', cat.id), { enc: true });

  let encArr = await encryptAccts(decAccts);

  console.log('encArr', encArr);

  const bUpd = await updateAccts(encArr);

  toast('Encryption complete', 0);

  unblockScreen();

  console.timeEnd('encryptCat');
}

async function decryptCat(cat) {
  // used
  // console.time("decryptCat");
  const confirmOK = await confirmDialog(
    "<strong class='text-red'>Warning !",
    'Decrypting sheet can expose passwords and other sensitive data to others with access to your account.<br><br>Do you wish to continue ?'
  );
  if (!confirmOK) {
    toast('Decryption cancelled', 0);
    unblockScreen();
    return null;
  }
  blockScreen('Decryption underway');

  const col = collection(db, 'accounts');
  const q = query(col, where('categoryId', '==', cat.id));
  const getAccts = await getDocs(q);

  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);
  if (!encAccts.length) {
    alertDialog('Decrypt Category', `Category ${cat.name} has no encrypted accounts`);
    updateDoc(doc(db, 'categories', cat.id), { enc: false });
    unblockScreen();
    return;
  }

  toast(`Decrypting ${cat.name}`, 0);

  let encArr = await decryptAccts(encAccts, false);

  console.log('encArr', encArr);

  const bUpd = await updateAccts(encArr);

  await updateDoc(doc(db, 'categories', cat.id), { enc: false });

  toast('Decryption complete', 0);

  unblockScreen();

  console.log('decryptCat:', accts.length);
  console.timeEnd('decryptCat');
}

async function encryptAccts(accts) {
  const categoryStore = useCategoryStore();

  console.time('encryptAccts');

  try {
    // Process every account concurrently decrypted
    const encryptionPromises = accts.map(async (acct) => {
      const { encryptedData, ...plaintextRoot } = acct;

      const catEnc = categoryStore.getCatEnc(acct.categoryId);
      console.log('catEnc', catEnc);

      // 2. Encrypt the entire stringified payload at once (uses ONE combined IV)
      const encryptedString = catEnc ? await encryptMessage(encryptedData) : encryptedData;

      // 3. Return the clean, unified document structure
      return {
        ...plaintextRoot,
        enc: catEnc,
        encryptedData: encryptedString,
      };
    });

    const result = await Promise.all(encryptionPromises);

    console.log('Migrated Accounts Count:', result.length);
    console.timeEnd('encryptAccts');

    return result; // Ready to be bulk written back to Firestore!
  } catch (error) {
    console.log(`Encryption failed: ${error.message}`);
  }
}

async function decryptAcctReactive(acct) {
  console.log('decryptAcctReactive', acct, acct.encryptedData);
  // If the account isn't encrypted or doesn't have our combined payload block, skip it
  if (!acct.encryptedData) return;

  try {
    // 1. Decrypt the single consolidated string block
    const decryptedJsonString = acct.enc ? await decryptMessage(acct.encryptedData) : acct.encryptedData;
    const decryptedPayload = JSON.parse(decryptedJsonString);

    acct.enc = false;
    // 2. Reactively inject the decrypted fields directly into the existing object
    //    This preserves Vue's reactivity proxy!
    Object.keys(decryptedPayload).forEach((key) => {
      console.log('keys', key, decryptedPayload[key]);
      acct[key] = decryptedPayload[key];
    });

    // 3. Clean up the object reactively
    //    Remove the raw encrypted block so it doesn't linger in local form state
    delete acct.encryptedData;
  } catch (error) {
    console.error(`Reactive decryption failed for document:`, error);
  }
}

async function decryptAccts(accts, parseEncryptedData = true) {
  console.log('decryptAccts', accts);

  // Process every account concurrently
  const decryptionPromises = accts.map(async (obj) => {
    // If the document isn't marked as encrypted flatten and expand
    if (!obj.enc) {
      const { encryptedData, ...plaintextRoot } = obj;
      const decryptedPayload = encryptedData ? JSON.parse(encryptedData) : {};
      return {
        ...plaintextRoot,
        encryptedData: decryptedPayload,
      };
    }
    // 1. Decrypt the unified string block
    const decryptedJsonString = await decryptMessage(obj.encryptedData || '{}');

    // 2. Parse it back into a temporary JavaScript object
    const decryptedPayload = parseEncryptedData ? JSON.parse(decryptedJsonString) : decryptedJsonString;

    // 3. Destructure to pull 'encryptedData' out, leaving only plaintext root fields
    const { encryptedData, ...plaintextRoot } = obj;
    plaintextRoot.enc = false;

    // 4. Combine root fields and decrypted payload into a flat object
    return {
      ...plaintextRoot,
      encryptedData: decryptedPayload,
    };
  });

  // Resolve all 196 account decryptions simultaneously
  const result = await Promise.all(decryptionPromises);

  console.log(`Successfully batch-decrypted ${result.length} accounts.`);

  return result; // Returns a flat array of plaintext account objects
  // } catch (error) {
  //   console.timeEnd('decryptAcctsBatch');
  //   alertDialog('Decryption failed', error);
  //   // throw new Error(`decryption failed: ${error.message}`);
  //   console.log(`decryption failed: ${error.message}`);
  // }
}

async function updateAccts(accts) {
  console.time('updateAccts');

  const batch = writeBatch(db);

  for (let i = 0; i < accts.length; i++) {
    let acct = accts[i];
    const { id, ...acctNoId } = acct; // Removes 'id' and creates a new object

    console.log('update', accts[i], acctNoId);

    const docRef = doc(db, 'accounts', acct.id);
    batch.set(docRef, acctNoId);
  }

  await batch
    .commit()
    .then((result) => {
      console.log('updateAccts: ', accts.length);
      console.timeEnd('updateAccts');
      console.log('Batch update successful!');

      return result;
    })
    .catch((error) => {
      console.error('Batch update failed: ', error);
      alertDialog('Batch update failed', error);
      return error;
    });
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
