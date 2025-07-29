import { createRouter, createWebHistory } from "vue-router";
import Categories from "@/views/Categories.vue";
import Accounts from "@/views/Accounts.vue";
import ShowAccount from "@/views/ShowAccount.vue";
import Login from "@/views/Login.vue";
import { auth } from "@/firebase";

const routes = [
  {
    path: "/categories",
    name: "Categories",
    component: Categories,
    meta: { requiresAuth: true },
  },
  {
    path: "/accounts",
    name: "Accounts",
    component: Accounts,
    meta: { requiresAuth: true },
  },
  {
    path: "/account/:accountId",
    name: "ShowAccount",
    component: ShowAccount,
    meta: { requiresAuth: true },
  },
  {
    path: "/",
    name: "Login",
    component: Login,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition; // Restore saved scroll position when navigating back
    }
    if (to.path === "/") {
      return { top: 0 }; // Scroll to top for Category.vue on initial load
    }
    return { top: 0 }; // Default for other routes
  },
});

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthenticated = auth.currentUser;

  if (requiresAuth && !isAuthenticated) {
    next("/");
  } else {
    next();
  }
});

export default router;
