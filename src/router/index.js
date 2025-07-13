import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Categories from "../views/Categories.vue";

console.log("hi dan");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Login",
      component: Login,
    },
    {
      path: "/categories",
      name: "Categories",
      component: Categories,
    },
  ],
});

export default router;
