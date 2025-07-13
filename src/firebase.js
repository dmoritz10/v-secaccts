import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyArHUnN8MRxiccN30TV8cJzkReBTfwQm98",
  authDomain: "v-secaccts.firebaseapp.com",
  projectId: "v-secaccts",
  storageBucket: "v-secaccts.firebasestorage.app",
  messagingSenderId: "1098541049072",
  appId: "1:1098541049072:web:36813df32dda10d401ce35",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };
