import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
// import { useAuthStore } from "@/stores/auth";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";

import { vuetify } from "./plugins/vuetify";
import { pinia } from "@/services/pinia";
import * as dialogs from "@/ui/dialogState.js";

const app = createApp(App);
app.use(pinia);

useAccountStore();
useCategoryStore();

app.use(router);
app.use(vuetify);
// app.use(UiPlugin);
// Make dialog helpers available globally
app.config.globalProperties.$toast = dialogs.toast;
app.config.globalProperties.$alert = dialogs.alertDialog;
app.config.globalProperties.$confirm = dialogs.confirmDialog;
app.config.globalProperties.$block = dialogs.blockScreen;
app.config.globalProperties.$unblock = dialogs.unblockScreen;

app.mount("#app");
