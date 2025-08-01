import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";
import "@/assets/index.css";

const vuetify = createVuetify({
  components,
  directives,
});

const pinia = createPinia();

const app = createApp(App);
app.use(router);
app.use(vuetify);
app.use(pinia);
app.mount("#app");
