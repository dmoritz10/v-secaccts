<template>
  <v-container class="pt-5 bg-grey-lighten-3">
    <v-sheet class="px-4 py-10 mb-5" elevation="5" rounded>
      <v-row class="align-center justify-center">
        <h1 class="subtitle-1 grey--text text-center">
          Secure Accounts Authorization
        </h1>
      </v-row>
    </v-sheet>
    <v-row class="my-10" justify="center">
      <v-btn
        id="customGoogleBtn"
        color="primary"
        rounded
        large
        @click="signIn"
        class="google-btn"
      >
        Sign in
      </v-btn>
      <!-- <v-btn color="grey" @click="handleSignOut">
        Sign Out
        <v-icon end>mdi-exit-to-app</v-icon>
      </v-btn> -->
    </v-row>
    <!-- Modal (v-dialog) -->
    <v-dialog class="mt-16" v-model="dialogLogin" max-width="600">
      <v-card class="pa-5">
        <v-card-title class="text-h5">Sign in Verification</v-card-title>
        <v-form ref="form">
          <v-text-field v-model="usr" label="User" required></v-text-field>
          <v-text-field
            type="password"
            v-model="pwd"
            label="Password"
            required
          ></v-text-field>
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
import { db, auth, provider } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getOption, getUser, clearUser } from "../services/common";
import { encryptMessage, decryptMessage } from "../services/enc";
import {
  toast,
  alertDialog,
  confirmDialog,
  blockScreen,
  unblockScreen,
} from "@/ui/dialogState.js";

const router = useRouter();
const authStore = useAuthStore();
const usr = ref("dmoritz10");
const pwd = ref("Tempdm123!");
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
        dialogLogin.value = true;
      } else {
        // No Firebase user, clear store and keep dialog closed
        authStore.clearUser();
        dialogLogin.value = false;
      }
      unsubscribe();
      resolve();
    });
  });
  console.log("Login.vue. onMounted complete");
});

const signIn = async () => {
  try {
    await signInWithPopup(auth, provider);
    dialogLogin.value = true;
    // onAuthStateChanged handles setting user data and showing dialog
  } catch (error) {
    console.error("signInWithPopup error:", error.message);
    authStore.clearUser();
    dialogLogin.value = false;
  }
};

const clearDialog = () => {
  dialogLogin.value = false;
  msg.value = "&nbsp;";
  usr.value = "";
  pwd.value = "";
  authStore.clearUser();
};

async function submit() {
  msg.value = "&nbsp;";

  const rtn = await getOption("shtList");
  if (!rtn) {
    alertDialog("Database open error");
    authStore.clearUser();
    await signOut(auth);
    return;
  }

  const userAuth = await getUser(usr.value.toLowerCase());
  if (!userAuth) {
    msg.value = "Invalid Login";
    authStore.clearUser();
    return;
  }

  const t = await getOption("qbf");
  let dx;
  try {
    dx = await decryptMessage(rtn, pwd.value);
  } catch (err) {
    dx = null;
  }

  if (dx !== t) {
    msg.value = "Invalid Login";
    authStore.clearUser();
    return;
  }

  // Update currUser with verified credentials
  authStore.setUser({
    ...authStore.currUser,
    userName: usr.value.toLowerCase(),
    pwd: pwd.value,
    admin: userAuth.admin,
  });

  dialogLogin.value = false;
  router.replace("/categories");
}
</script>
