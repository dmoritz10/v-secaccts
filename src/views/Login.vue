<template>
  <v-container class="pt-5 bg-grey-lighten-3">
    <v-sheet class="px-4 py-10 mb-5" elevation="5" rounded>
      <v-row class="align-center justify-center">
        <v-col cols="12" class="py-0 px-0">
          <v-sheet class="mx-3 px-2 pt-3 pb-3 mt-1 mb-0" rounded>
            <v-row class="align-center">
              <v-col cols="1"></v-col>
              <v-col class="text-center">
                <h1 class="subtitle-1 grey--text text-center">Secure Accounts Authorization</h1>
              </v-col>
              <!-- Sandwich / 3-dot menu -->
              <v-col cols="1" class="d-flex justify-end">
                <v-menu location="bottom-end">
                  <template #activator="{ props }">
                    <v-btn icon v-bind="props" variant="text">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="restoreAllSheets">
                      <v-list-item-title>Restore DB from Backup</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>
    </v-sheet>
    <v-row class="my-10" justify="center">
      <v-btn id="customGoogleBtn" color="primary" rounded large @click="signIn" class="google-btn">
        Sign in
      </v-btn>
    </v-row>
    <!-- Modal (v-dialog) -->
    <v-dialog class="mt-16" v-model="dialogLogin" max-width="600">
      <v-card class="pa-5">
        <v-card-title class="text-h5">Sign in Verification</v-card-title>
        <v-form ref="form">
          <!-- <v-text-field v-model="usr" label="User" required></v-text-field> -->
          <v-card-text>{{ greeting }}</v-card-text>
          <v-text-field type="password" v-model="pwd" ref="pwdFocus" label="Password" required></v-text-field>
          <v-card-text>
            <div v-html="msg"></div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="submit">Submit</v-btn>
            <v-btn color="grey" text @click="clearDialog">Cancel</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { auth, provider } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getOption, getUser } from "../services/common";
import { alertDialog } from "@/ui/dialogState.js";
import { initializeVerifier, verifyPassword } from "../services/enc.js";
import { setKey, clearKey } from "@/services/keyVault";
import { restoreAllSheets } from "@/services/restoreDB";

const router = useRouter();
const authStore = useAuthStore();
const greeting = ref("Welcome");

const pwd = ref("");
const pwdFocus = ref(null);
const dialogLogin = ref(false);
const msg = ref("&nbsp;");

onMounted(async () => {
  console.log("Login.vue onMounted begin", authStore.currUser);
  // Clear auth store on mount to force Firestore re-authentication
  authStore.clearUser();
  msg.value = "&nbsp;";

  // Wait for Firebase auth to initialize
  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Firebase user exists, set basic data and prompt for Firestore verification
        authStore.setUser({
          name: user.displayName,
          email: user.email,
          uid: user.uid,
        });
        greeting.value = `Hi ${user.displayName.split(" ")[0]}`;
        dialogLogin.value = true;
        console.log("onAuthStateChanged", user, authStore);
      } else {
        // No Firebase user, clear store and keep dialog closed
        authStore.clearUser();
        dialogLogin.value = false;
        console.log("onAuthStateChanged", "no firebase user");
      }
      unsubscribe();
      resolve();
    });
  });

  pwdFocus.value?.focus();

  console.log("Login.vue. onMounted complete");
});

const signIn = async () => {
  console.log("signIn", authStore);

  try {
    const googleUser = await signInWithPopup(auth, provider);
    authStore.setUser({
      name: googleUser.user.displayName,
      email: googleUser.user.email,
      uid: googleUser.user.uid,
    });
    dialogLogin.value = true;
    // onAuthStateChanged handles setting user data and showing dialog
  } catch (error) {
    authStore.clearUser();
    dialogLogin.value = false;
  }
};

const clearDialog = () => {
  dialogLogin.value = false;
  msg.value = "&nbsp;";
  pwd.value = "";
  authStore.clearUser();
};

async function submit() {
  console.log("submit", authStore);
  msg.value = "&nbsp;";

  // One-time routine to initialize the vault option
  // It is important to fully decrypt all categories before running
  // (async () => {
  //   const password = prompt("Enter the shared encryption password (for setup only):");
  //   const verifierData = await initializeVerifier(password);

  //   console.log("Verifier object to store in Firebase:");
  //   console.log(JSON.stringify(verifierData, null, 2));
  // })();
  // return;

  const vault = await getOption("vault");
  if (!vault) {
    alertDialog("Invalid Login");
    authStore.clearUser();
    clearKey();
    await signOut(auth);
    return;
  }

  const userAuth = await getUser(authStore.currUser.uid);

  if (!userAuth) {
    msg.value = "Invalid Login";
    // authStore.clearUser();
    console.log("1", authStore.currUser);
    clearKey();
    return;
  }

  var key = await verifyPassword(pwd.value, vault);

  pwd.value = null;

  if (!key) {
    msg.value = "Invalid Login";
    console.log("2", authStore.currUser);

    // authStore.clearUser();
    clearKey();
    return;
  }

  setKey(key);

  // Update currUser with verified credentials
  authStore.setUser({
    ...authStore.currUser,
    userName: userAuth.name,
    admin: userAuth.admin,
  });

  dialogLogin.value = false;

  router.replace("/categories");
}
</script>
