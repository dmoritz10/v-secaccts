<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title class="text-h6">Change Password</v-card-title>

      <v-card-text>
        <v-text-field
          v-model="currentPwd"
          label="Current Password"
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
import { getOption } from '@/services/common';

import { collection, doc, query, getDocs, where, writeBatch } from 'firebase/firestore';
import { toast, alertDialog, blockScreen, unblockScreen } from '@/ui/dialogState.js';
import { db } from '@/firebase';

import { encryptAccts, decryptAccts } from '@/services/common';
import { verifyPassword, buildVerifierData } from '@/services/enc';
import { setKey, getKey, clearKey } from '@/services/keyVault';

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
const showConfirmPwd = ref(false);
const showCurrentPwd = ref(false);
const showNewPwd = ref(false);

const confirmErrorMsg = computed(() => {
  if (!confirmTouched.value) return '';
  if (!confirmPwd.value) {
    return 'Please confirm your password';
  }
  if (newPwd.value !== confirmPwd.value) {
    return 'Passwords do not match';
  }
  if (!strongRegex.test(newPwd.value)) {
    return invalidPwdMsg;
  }
  return '';
});

const confirmError = computed(() => confirmErrorMsg.value !== '');

const canSubmit = computed(() => currentPwd.value && newPwd.value && confirmPwd.value && !confirmError.value);

// Open method for parent
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

// Cancel
function cancel() {
  currentPwd.value = '';
  newPwd.value = '';
  confirmPwd.value = '';
  confirmTouched.value = false;
  showCurrentPwd.value = false;
  showNewPwd.value = false;
  showConfirmPwd.value = false;
  show.value = false;
}

async function getVaultDocRef() {
  const options = collection(db, 'options');
  const q = query(options, where('key', '==', 'vault'));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return doc(collection(db, 'options')); // pre-allocate a new ref, no write yet
  }
  return doc(db, 'options', querySnapshot.docs[0].id);
}

async function commitPasswordChange(verifierData, reEncAccts, reEncDocs) {
  const batch = writeBatch(db);

  const vaultRef = await getVaultDocRef();
  const { key, ...vaultPayload } = verifierData; // strip non-serializable CryptoKey
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

  const oldKey = getKey(); // snapshot for rollback if anything fails below

  try {
    // Decrypt everything with the OLD key, still active at this point
    const acctsSnapshot = await getDocs(collection(db, 'accounts'));
    const accts = acctsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const decAccts = await decryptAccts(accts);

    const docsSnapshot = await getDocs(collection(db, 'documents'));
    const docs = docsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const decDocs = await decryptAccts(docs);

    // Build new verifier + key, no DB write yet
    const verifierData = await buildVerifierData(newPwd.value);
    newPwd.value = null;
    const newKey = verifierData.key;

    // Activate the new key now, since encryptMessage() reads getKey() internally
    setKey(newKey);

    const reEncAccts = await encryptAccts(decAccts);
    const reEncDocs = await encryptAccts(decDocs);

    // Single atomic commit: vault + accounts + documents together
    await commitPasswordChange(verifierData, reEncAccts, reEncDocs);

    toast('Change of password is complete', 3000);
  } catch (error) {
    console.error('Password change failed:', error);
    setKey(oldKey); // roll back — old password/key remains valid
    alertDialog('Change Password', 'Failed to update password — your old password is still active.');
  } finally {
    unblockScreen();
  }
}

defineExpose({ open });
</script>
