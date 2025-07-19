import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Categories from "../views/Categories.vue";
import Accounts from "../views/Accounts.vue";

const routes = [
  {
    path: "/",
    name: "Login",
    component: Login,
  },
  { path: "/categories", name: "Categories", component: Categories },
  {
    path: "/accounts/:categoryId/:categoryName",
    name: "Accounts",
    component: Accounts,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
