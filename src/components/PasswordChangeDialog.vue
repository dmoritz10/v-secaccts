<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title class="text-h6">Change Password</v-card-title>

      <v-card-text>
        <v-text-field
          v-model="currentPwd"
          label="Current Password"
          autofocus
          :type="showCurrentPwd ? 'text' : 'password'"
          :append-inner-icon="showCurrentPwd ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showCurrentPwd = !showCurrentPwd"
          variant="outlined" />

        <v-text-field
          v-model="newPwd"
          label="New Password"
          :type="showNewPwd ? 'text' : 'password'"
          :append-inner-icon="showNewPwd ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showNewPwd = !showNewPwd"
          variant="outlined" />
        <v-text-field
          v-model="confirmPwd"
          label="Confirm New Password"
          :type="showConfirmPwd ? 'text' : 'password'"
          :append-inner-icon="showConfirmPwd ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showConfirmPwd = !showConfirmPwd"
          variant="outlined"
          :error="confirmError"
          :error-messages="confirmErrorMsg"
          @blur="confirmTouched = true" />
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn color="primary" :disabled="!canSubmit" @click="submit">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { collection, doc, query, getDocs, where, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage, auth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { toast, alertDialog, blockScreen, unblockScreen } from '@/ui/dialogState.js';
import { getOption, encryptAccts, decryptAccts } from '@/services/common';
import { buildVerifierData, verifyPassword, encryptBlob } from '@/services/enc';
import { setKey, getKey, clearKey } from '@/services/keyVault';
import { useDocumentStore } from '@/stores/document';

const documentStore = useDocumentStore();

const strongRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})');
const invalidPwdMsg = `Passwords must contain at least
    1 lowercase alphabetical character and
    1 uppercase alphabetical character and
    1 numeric character and
    1 special character and
    8 characters
    `;

const show = ref(false);
const currentPwd = ref('');
const newPwd = ref('');
const confirmPwd = ref('');
const confirmTouched = ref(false);
const showCurrentPwd = ref(false);
const showNewPwd = ref(false);
const showConfirmPwd = ref(false);

const confirmErrorMsg = computed(() => {
  if (!confirmTouched.value) return '';
  if (!confirmPwd.value) return 'Please confirm your password';
  if (newPwd.value !== confirmPwd.value) return 'Passwords do not match';
  if (!strongRegex.test(newPwd.value)) return invalidPwdMsg;
  return '';
});

const confirmError = computed(() => confirmErrorMsg.value !== '');
const canSubmit = computed(() => currentPwd.value && newPwd.value && confirmPwd.value && !confirmError.value);

function open() {
  currentPwd.value = '';
  newPwd.value = '';
  confirmPwd.value = '';
  confirmTouched.value = false;
  showCurrentPwd.value = false;
  showNewPwd.value = false;
  showConfirmPwd.value = false;
  show.value = true;
}

function cancel() {
  show.value = false;
  currentPwd.value = null;
  newPwd.value = null;
}

async function getVaultDocRef() {
  const options = collection(db, 'options');
  const q = query(options, where('key', '==', 'vault'));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return doc(collection(db, 'options'));
  }
  return doc(db, 'options', querySnapshot.docs[0].id);
}

async function commitPasswordChange(verifierData, reEncAccts, reEncDocs) {
  const batch = writeBatch(db);

  const vaultRef = await getVaultDocRef();
  const { key, ...vaultPayload } = verifierData;
  batch.set(vaultRef, { key: 'vault', value: vaultPayload });

  for (const acct of reEncAccts) {
    const { id, ...rest } = acct;
    batch.set(doc(db, 'accounts', id), rest);
  }

  for (const docItem of reEncDocs) {
    const { id, ...rest } = docItem;
    batch.set(doc(db, 'documents', id), rest);
  }

  return batch.commit();
}

async function reEncryptDocumentFiles(documents) {
  const results = [];

  for (const docItem of documents) {
    const entry = { id: docItem.id, name: docItem.name, frontPath: docItem.frontPath, backPath: docItem.backPath };

    if (docItem.frontPath) {
      try {
        entry.frontBlob = await documentStore.downloadDocumentFile(docItem.frontPath, docItem.frontType);
      } catch (e) {
        throw new Error(
          `Failed to decrypt FRONT file for document "${docItem.name}" (id: ${docItem.id}, path: ${docItem.frontPath}): ${e.message}`
        );
      }
    }

    if (docItem.backPath) {
      try {
        entry.backBlob = await documentStore.downloadDocumentFile(docItem.backPath, docItem.backType);
      } catch (e) {
        throw new Error(
          `Failed to decrypt BACK file for document "${docItem.name}" (id: ${docItem.id}, path: ${docItem.backPath}): ${e.message}`
        );
      }
    }

    results.push(entry);
  }

  return results;
}

async function uploadReEncryptedFiles(decryptedEntries) {
  const completed = [];

  for (const entry of decryptedEntries) {
    if (entry.frontBlob) {
      try {
        const encrypted = await encryptBlob(entry.frontBlob);
        await uploadBytes(storageRef(storage, entry.frontPath), encrypted);
        completed.push(`${entry.name} (FRONT)`);
      } catch (e) {
        throw new Error(
          `Failed to re-upload FRONT file for document "${entry.name}" (id: ${entry.id}, path: ${entry.frontPath}) after re-encrypting ${completed.length} file(s) already: ${e.message}. ` +
            `Already migrated to NEW key: ${completed.join(', ') || 'none'}.`
        );
      }
    }

    if (entry.backBlob) {
      try {
        const encrypted = await encryptBlob(entry.backBlob);
        await uploadBytes(storageRef(storage, entry.backPath), encrypted);
        completed.push(`${entry.name} (BACK)`);
      } catch (e) {
        throw new Error(
          `Failed to re-upload BACK file for document "${entry.name}" (id: ${entry.id}, path: ${entry.backPath}) after re-encrypting ${completed.length} file(s) already: ${e.message}. ` +
            `Already migrated to NEW key: ${completed.join(', ') || 'none'}.`
        );
      }
    }
  }

  return completed;
}

async function submit() {
  if (!canSubmit.value) return;

  const vault = await getOption('vault');
  if (!vault) {
    alertDialog('Database open error');
    clearKey();
    await signOut(auth);
    return;
  }

  show.value = false;

  const currKey = await verifyPassword(currentPwd.value, vault);
  currentPwd.value = null;

  if (!currKey) {
    newPwd.value = null;
    alertDialog('Change Password', 'Invalid password');
    return;
  }

  blockScreen();

  const oldKey = getKey();

  try {
    const acctsSnapshot = await getDocs(collection(db, 'accounts'));
    const accts = acctsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const decAccts = await decryptAccts(accts);

    const docsSnapshot = await getDocs(collection(db, 'documents'));
    const docs = docsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const decDocs = await decryptAccts(docs);

    // Decrypt all document files with the OLD key, while it's still active
    const decryptedFileEntries = await reEncryptDocumentFiles(docs);

    const verifierData = await buildVerifierData(newPwd.value);
    newPwd.value = null;
    const newKey = verifierData.key;

    setKey(newKey);

    const reEncAccts = await encryptAccts(decAccts);
    const reEncDocs = await encryptAccts(decDocs);

    // Re-encrypt + re-upload files with the NEW key
    await uploadReEncryptedFiles(decryptedFileEntries);

    await commitPasswordChange(verifierData, reEncAccts, reEncDocs);

    toast('Change of password is complete', 3000);
  } catch (error) {
    console.error('Password change failed:', error);
    setKey(oldKey);
    alertDialog(
      'Change Password Failed',
      error.message || 'An unknown error occurred. Your old password is still active.'
    );
  } finally {
    unblockScreen();
  }
}

defineExpose({ open });
</script>
