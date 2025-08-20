<template>
  <v-dialog v-model="show" max-width="400">
    <v-card>
      <v-card-title class="text-h6">Change Password</v-card-title>

      <v-card-text>
        <v-text-field
          v-model="currentPwd"
          label="Current Password"
          type="password"
          variant="outlined"
        />
        <v-text-field
          v-model="newPwd"
          label="New Password"
          type="password"
          variant="outlined"
        />
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
import { ref, computed, watch } from "vue";
import { getOption } from "@/services/common";

import {
  collection,
  doc,
  query,
  getDocs,
  where,
  updateDoc,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import {
  toast,
  alertDialog,
  confirmDialog,
  blockScreen,
  unblockScreen,
} from "@/ui/dialogState.js";
import { db } from "@/firebase";

import { encryptAccts, decryptAccts, acctDBFlds } from "@/services/common";
import { encryptMessage, decryptMessage } from "@/services/enc";
import { useAuthStore } from "@/stores/auth";
import { useAccountStore } from "@/stores/account";

const authStore = useAuthStore();
const accountStore = useAccountStore();

const strongRegex = new RegExp(
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})"
);
const invalidPwdMsg = `Passwords must contain at least 
    1 lowercase alphabetical character and 
    1 uppercase alphabetical character and 
    1 numeric character and
    1 special character and
    8 characters
    `;

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

const canSubmit = computed(
  () =>
    currentPwd.value && newPwd.value && confirmPwd.value && !confirmError.value
);

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
}

// Submit
async function submit() {
  if (!canSubmit.value) return;

  show.value = false;
  console.log("Current:", currentPwd.value);
  console.log("New:", newPwd.value);

  var pwdText = await getOption("qbf");

  var cPwd = await verifyCurrPwd(currentPwd.value);
  if (!cPwd) return;

  blockScreen();

  const getAccts = await getDocs(collection(db, "accounts"));
  let accts = getAccts.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const encAccts = accts.filter((acct) => acct.enc);

  const decAccts = await decryptAccts(encAccts, authStore.currUser.pwd);

  const reEncAccts = await encryptAccts(decAccts, newPwd.value);
  const encPwd = await encryptMessage(pwdText, newPwd.value);

  accountStore.unsubscribeFromAccounts();
  const updStat = await updateAcctsAndOption(reEncAccts, true, encPwd);
  accountStore.subscribeToAccounts();

  // Not necessary becase db update comes back
  // authStore.currUser.pwd = newPwd.value;

  unblockScreen();

  toast("Change of password is complete", 3000);
}

async function verifyCurrPwd(pwd) {
  var pwdEnc = await getOption("shtList");
  var qbf = await getOption("qbf");

  try {
    var dx = await decryptMessage(pwdEnc, pwd);
  } catch (err) {
    var dx = null;
  }

  console.log("verifyCurrPwd", dx, pwd, qbf);

  if (dx != qbf) {
    alertDialog("Change Password", "Invalid password");
    return null;
  }

  return pwd;
}

async function updateAcctsAndOption(accts, enc, encPwd) {
  console.time("updateAccts");
  const batch = writeBatch(db);

  for (let i = 0; i < accts.length; i++) {
    let acct = accts[i];
    const docRef = doc(db, "accounts", acct.id);
    for (const key in acct) {
      // remove non-db elements from acct
      if (acctDBFlds.indexOf(key) == -1) delete acct[key];
    }
    acct["enc"] = enc;
    batch.update(docRef, acct);
  }

  const options = collection(db, "options");
  const q = query(options, where("key", "==", "shtList"));
  const querySnapshot = await getDocs(q);
  const optionId = querySnapshot.docs[0].id; // Get first matching document
  console.log("optionId", querySnapshot.docs[0], optionId);
  const updateRef = doc(db, "options", optionId);
  batch.update(updateRef, { value: encPwd });

  let rtn = batch
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

  return rtn;
}

defineExpose({ open });
</script>
