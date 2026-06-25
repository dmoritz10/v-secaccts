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

async function encryptAccts(accts) {
  try {
    const encryptionPromises = accts.map(async (acct) => {
      const { encryptedData, ...plaintextRoot } = acct;
      const encryptedString = await encryptMessage(encryptedData);

      return {
        ...plaintextRoot,
        encryptedData: encryptedString,
      };
    });

    const result = await Promise.all(encryptionPromises);
    console.log('Encrypted count:', result.length);
    return result;
  } catch (error) {
    console.error(`Encryption failed: ${error.message}`);
    throw error;
  }
}

async function decryptAcctReactive(acct) {
  if (!acct.encryptedData) return;

  try {
    const decryptedJsonString = await decryptMessage(acct.encryptedData);
    const decryptedPayload = JSON.parse(decryptedJsonString);

    Object.keys(decryptedPayload).forEach((key) => {
      acct[key] = decryptedPayload[key];
    });

    delete acct.encryptedData;
  } catch (error) {
    console.error(`Reactive decryption failed for document:`, error);
  }
}

async function decryptAccts(accts) {
  const decryptionPromises = accts.map(async (obj) => {
    const { encryptedData, ...plaintextRoot } = obj;
    const decryptedJsonString = await decryptMessage(encryptedData);

    return {
      ...plaintextRoot,
      encryptedData: decryptedJsonString,
    };
  });

  const result = await Promise.all(decryptionPromises);
  console.log(`Successfully decrypted ${result.length} accounts.`);
  return result;
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

export { getUser, getOption, updateOption, encryptAccts, decryptAccts, updateAccts, decryptAcctReactive, dayjs };
