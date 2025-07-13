import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";

// Suppress Workbox logs in development
if (import.meta.env.MODE === "development") {
  self.__WB_DISABLE_DEV_LOGS = true;
}

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.mount("#app");
