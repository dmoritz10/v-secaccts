<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title class="text-h6">Change Password</v-card-title>

      <v-card-text>
        <v-text-field v-model="currentPwd" label="Current Password" type="password" variant="outlined" />
        <v-text-field v-model="newPwd" label="New Password" type="password" variant="outlined" />
        <v-text-field
          v-model="confirmPwd"
          label="Confirm New Password"
          type="password"
          variant="outlined"
          :error="confirmError"
          :error-messages="confirmErrorMsg"
        />
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
import { ref, computed } from "vue";
import { getOption, updateAccts } from "@/services/common";

import { collection, doc, query, getDocs, where, updateDoc, writeBatch, orderBy } from "firebase/firestore";
import { toast, alertDialog, blockScreen, unblockScreen } from "@/ui/dialogState.js";
import { db } from "@/firebase";

import { encryptAccts, decryptAccts, acctDBFlds } from "@/services/common";
import { verifyPassword, initializeVerifier, deriveKey } from "@/services/enc";
import { setKey, clearKey } from "@/services/keyVault";
import { useAccountStore } from "@/stores/account";

const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})");
const invalidPwdMsg = `Passwords must contain at least
    1 lowercase alphabetical character and
    1 uppercase alphabetical character and
    1 numeric character and
    1 special character and
    8 characters
    `;

const accountStore = useAccountStore();

const show = ref(false);
const currentPwd = ref("");
const newPwd = ref("");
const confirmPwd = ref("");
const confirmErrorMsg = computed(() => {
  if (!confirmPwd.value) {
    return "Please confirm your password";
  }
  if (newPwd.value !== confirmPwd.value) {
    return "Passwords do not match";
  }
  if (!strongRegex.test(newPwd.value)) {
    return invalidPwdMsg;
  }
  return "";
});

const confirmError = computed(() => confirmErrorMsg.value !== "");

const canSubmit = computed(() => currentPwd.value && newPwd.value && confirmPwd.value && !confirmError.value);

// Open method for parent
function open() {
  currentPwd.value = "";
  newPwd.value = "";
  confirmPwd.value = "";
  show.value = true;
}

// Cancel
function cancel() {
  show.value = false;
  currentPwd.value = null;
  newPwd.value = null;
}

async function submit() {
  if (!canSubmit.value) return;

  const vault = await getOption("vault");
  if (!vault) {
    alertDialog("Database open error");
    clearKey();
    await signOut(auth);
    return;
  }

  show.value = false;

  var currKey = await verifyPassword(currentPwd.value, vault);

  currentPwd.value = null;

  if (!currKey) {
    newPwd.value = null;
    alertDialog("Change Password", "Invalid password");
    return null;
  }

  blockScreen();

  const getAccts = await getDocs(collection(db, "accounts"));
  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);

  const decAccts = await decryptAccts(encAccts);

  const newVault = await initializeVerifier(newPwd.value);

  const { salt } = newVault;

  const newKey = await deriveKey(newPwd.value, salt);

  newPwd.value = null;

  setKey(newKey);

  const reEncAccts = await encryptAccts(decAccts);

  accountStore.unsubscribeFromAccounts();
  const bUpd = await updateAccts(reEncAccts, true);
  accountStore.subscribeToAccounts();

  unblockScreen();

  toast("Change of password is complete", 3000);
}

defineExpose({ open });
</script>
