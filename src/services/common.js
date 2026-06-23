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
import { useDocCategoryStore } from '@/stores/docCategory';

export const acctEncFlds = ['accountNbr', 'login', 'loginUrl', 'notes', 'password', 'pinNbr', 'securityQA'];
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

export const docEncFlds = ['notes', 'docNbr', 'pinNbr'];
export const docDBFlds = [
  'notes',
  'docNbr',
  'pinNbr',
  'name',
  'provider',
  'docCategoryId',
  'enc',
  'favorite',
  'expiry',
  'lastChange',
];

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const getRecencyText = (dateVal) => {
  if (!dateVal) return '';

  const date = dayjs.utc(dateVal);
  const now = dayjs.utc();
  const diffInDays = now.diff(date, 'day');

  // Custom overrides for that "Google" feel
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';

  // .fromNow() handles "3 days ago", "last month", "2 years ago"
  return date.fromNow();
};

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

async function encryptCat(cat, catType = 'accounts') {
  console.log('encryptCat', catType);

  // blockScreen();

  if (catType == 'accounts') {
    var catCol = 'categories';
    var acctCol = 'accounts';
    var catIdField = 'categoryId';
  } else {
    var catCol = 'docCategories';
    var acctCol = 'documents';
    var catIdField = 'docCategoryId';
  }

  const col = collection(db, acctCol);
  const q = query(col, where(catIdField, '==', cat.id));
  const getAccts = await getDocs(q);
  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const decAccts = accts.filter((acct) => !acct.enc);

  if (!decAccts.length) {
    alertDialog('Encrypt Category', `Category ${cat.name} has no decrypted accounts`);
    updateDoc(doc(db, catCol, cat.id), { enc: true });
    unblockScreen();
    return;
  }

  toast(`Encrypting ${cat.name}`, 5000);

  await updateDoc(doc(db, catCol, cat.id), { enc: true });

  let encArr = await encryptAccts(decAccts, catType);

  const bUpd = await updateAccts(encArr, catType);

  toast('Encryption complete', 0);

  unblockScreen();
}

async function decryptCat(cat, catType = 'accounts') {
  console.log('decryptCat', catType);

  if (catType == 'accounts') {
    var catCol = 'categories';
    var acctCol = 'accounts';
    var catIdField = 'categoryId';
  } else {
    var catCol = 'docCategories';
    var acctCol = 'documents';
    var catIdField = 'docCategoryId';
  }

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

  const col = collection(db, acctCol);
  const q = query(col, where(catIdField, '==', cat.id));
  const getAccts = await getDocs(q);

  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);
  if (!encAccts.length) {
    alertDialog('Decrypt Category', `Category ${cat.name} has no encrypted accounts`);
    updateDoc(doc(db, catCol, cat.id), { enc: false });
    unblockScreen();
    return;
  }

  toast(`Decrypting ${cat.name}`, 0);

  let encArr = await decryptAccts(encAccts, catType);

  const bUpd = await updateAccts(encArr, catType);

  await updateDoc(doc(db, catCol, cat.id), { enc: false });

  toast('Decryption complete', 0);

  unblockScreen();
}

async function encryptAccts(accts, catType = 'accounts') {
  console.log('encryptAccts', catType);

  try {
    // Process every account concurrently decrypted
    const encryptionPromises = accts.map(async (acct) => {
      const { encryptedData, ...plaintextRoot } = acct;

      let catEnc;
      if (catType == 'accounts') {
        const categoryStore = useCategoryStore();
        catEnc = categoryStore.getCatEnc(acct.categoryId);
      } else {
        const docCategoryStore = useDocCategoryStore();
        catEnc = docCategoryStore.getCatEnc(acct.docCategoryId);
      }

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

    return result; // Ready to be bulk written back to Firestore!
  } catch (error) {
    console.log(`Encryption failed: ${error.message}`);
  }
}

async function decryptAcctReactive(acct) {
  console.log('decryptAcctReactive');
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
      acct[key] = decryptedPayload[key];
    });

    // 3. Clean up the object reactively
    //    Remove the raw encrypted block so it doesn't linger in local form state
    delete acct.encryptedData;
  } catch (error) {
    console.error(`Reactive decryption failed for document:`, error);
  }
}

async function decryptAccts(accts) {
  console.log('decryptAccts');

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

    // 3. Destructure to pull 'encryptedData' out, leaving only plaintext root fields
    const { encryptedData, ...plaintextRoot } = obj;
    plaintextRoot.enc = false;

    // 4. Combine root fields and decrypted payload into a flat object
    return {
      ...plaintextRoot,
      encryptedData: decryptedJsonString,
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

async function updateAccts(accts, catType = 'accounts') {
  console.log('updateAccts', catType);

  const batch = writeBatch(db);

  for (let i = 0; i < accts.length; i++) {
    let acct = accts[i];
    const { id, ...acctNoId } = acct; // Removes 'id' and creates a new object

    const docRef = doc(db, catType, acct.id);
    batch.set(docRef, acctNoId);
  }

  await batch
    .commit()
    .then((result) => {
      console.log('updateAccts: ', accts.length);
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
  getUser,
  getOption,
  updateOption,
  encryptCat,
  decryptCat,
  encryptAccts,
  decryptAccts,
  updateAccts,
  decryptAcctReactive,
  dayjs,
};
