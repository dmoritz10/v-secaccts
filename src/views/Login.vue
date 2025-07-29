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
      <v-btn color="grey" @click="handleSignOut">
        Sign Out
        <v-icon end>mdi-exit-to-app</v-icon>
      </v-btn>
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
            <v-btn color="grey" text @click="dialogLogin = false">Cancel</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { db, auth, provider } from "../firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { getOption, getUser, clearUser } from "../common";
import { currUser } from "../global";
import { encryptMessage, decryptMessage } from "../enc";
import router from "../router";

// const usr = ref("dmoritz10");
// const pwd = ref("Tempdm123!");
const usr = ref("dmoritz10");
const pwd = ref("Tempdm123!");
const dialogLogin = ref(false);
const msg = ref(null);

onMounted(() => {
  handleSignOut();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currUser.name = user.displayName;
      currUser.email = user.email;
      currUser.uid = user.uid;
      dialogLogin.value = true; // Open modal on sign-in
    } else {
      dialogLogin.value = false;
      clearUser(currUser);
    }
  });

  //   const unsubscribe = onSnapshot(
  //     collection(db, "categories"),
  //     (snapshot) => {
  //       messages.value = snapshot.docs.map((doc) => ({
  //         id: doc.id,
  //         ...doc.data(),
  //       }));
  //     }
  //   );
});

const signIn = async () => {
  console.log("signIn");

  signInWithPopup(auth, provider)
    .then(async (result) => {
      console.log("signInWithPopup");

      //   initializeAcctsSnapshot();
    })
    .catch((error) => {
      console.log("signInWithPopup", error.message);
    });
};

const handleSignOut = async () => {
  try {
    await signOut(auth);
    clearUser(currUser);
    //   unsubscribe();
    console.log("Sign-out successful");
  } catch (error) {
    clearUser(currUser);
    console.error("Sign-out error:", error);
  }
};

async function submit() {
  console.log("submitLogin");
  msg.value = "&nbsp;";

  var rtn = await getOption("shtList");
  if (!rtn) {
    await alert("db open error");
    clearUser(currUser);
    signOut(auth);
    window.close();
  }
  var userAuth = await getUser(usr.value);

  if (!userAuth) {
    msg.value = "Invalid Login";
    clearUser(currUser);
    return;
  } else {
    currUser.admin = userAuth.admin;
  }

  var t = await getOption("qbf");

  try {
    var dx = await decryptMessage(rtn, pwd.value);
  } catch (err) {
    var dx = null;
  }

  if (dx != t) {
    msg.value = "Invalid Login";
    clearUser(currUser);
    return;
  }

  currUser.userName = usr.value;
  currUser.pwd = pwd.value;

  dialogLogin.value = false; // Close modal on sign-in

  console.log("currUser", currUser);
  // const router = useRouter();
  // router.push("/categories");
  router.replace("/categories");
  // goHome();
}
</script>
