import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import { vuetify } from "./plugins/vuetify";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

useAccountStore();
useCategoryStore();

app.use(router);
app.use(vuetify);

app.mount("#app");
