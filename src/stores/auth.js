import { defineStore } from "pinia";
import { reactive } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";

export const useAuthStore = defineStore("auth", () => {
  const currUser = reactive({
    name: null,
    email: null,
    uid: null,
    userName: null,
    admin: false,
  });

  const setUser = (userData) => Object.assign(currUser, userData);
  const clearUser = () => Object.keys(currUser).forEach((k) => (currUser[k] = null));

  // Keep in sync with Firebase automatically
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setUser({
        name: user.displayName,
        email: user.email,
        uid: user.uid,
      });
    } else {
      clearUser();
    }
  });

  return { currUser, setUser, clearUser };
});
