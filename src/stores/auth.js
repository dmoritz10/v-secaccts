import { reactive } from "vue";
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", () => {
  const currUser = reactive({
    name: null,
    email: null,
    uid: null,
    userName: null,
    admin: false,
  });

  const setUser = (userData) => {
    currUser.name = userData.name || null;
    currUser.email = userData.email || null;
    currUser.uid = userData.uid || null;
    currUser.userName = userData.userName || null;
    currUser.admin = userData.admin || false;
  };

  const clearUser = () => {
    currUser.name = null;
    currUser.email = null;
    currUser.uid = null;
    currUser.userName = null;
    currUser.admin = false;
  };

  return { clearUser, setUser, currUser };
});
