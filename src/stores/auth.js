import { ref } from "vue";
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    currUser: ref({
      name: null,
      email: null,
      uid: null,
      userName: null,
      pwd: null,
      admin: false,
    }),
  }),
  actions: {
    setUser(userData) {
      this.currUser.name = userData.name || null;
      this.currUser.email = userData.email || null;
      this.currUser.uid = userData.uid || null;
      this.currUser.userName = userData.userName || null;
      this.currUser.pwd = userData.pwd || null;
      this.currUser.admin = userData.admin || false;
    },
    clearUser() {
      this.currUser.name = null;
      this.currUser.email = null;
      this.currUser.uid = null;
      this.currUser.userName = null;
      this.currUser.pwd = null;
      this.currUser.admin = false;
    },
    resetStore() {
      this.$reset();
    },
  },
});
