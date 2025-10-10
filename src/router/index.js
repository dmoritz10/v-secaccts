import { createRouter, createWebHistory } from "vue-router";
import { auth } from "../firebase";
import Categories from "@/views/Categories.vue";
import Accounts from "@/views/Accounts.vue";
import ShowAccount from "@/views/ShowAccount.vue";
import Login from "@/views/Login.vue";
import { useAuthStore } from "@/stores/auth";
import { getKey } from "@/services/keyVault";
const routes = [
  { path: "/", component: Login },
  { path: "/categories", component: Categories, meta: { requiresAuth: true } },
  { path: "/accounts", component: Accounts, meta: { requiresAuth: true } },
  { path: "/account/:accountId", component: ShowAccount, meta: { requiresAuth: true } },
  { path: "/login", component: Login },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  console.log("beforeEach", to, from, next);
  const authStore = useAuthStore();

  // Wait for Firebase auth to initialize
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve();
    });
  });

  const isAuthenticated = authStore.currUser && authStore.currUser.userName && getKey();
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Clear authStore to ensure fresh state on redirect to login
    authStore.clearUser();
    console.log("next");
    next("/");
  } else {
    console.log("next");

    next();
  }
});

export default router;
