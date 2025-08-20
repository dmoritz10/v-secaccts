// import { h, render } from "vue";
// import UiContainer from "./UiContainer.vue";
// import {
//   toast,
//   alertDialog,
//   confirmDialog,
//   blockScreen,
//   unblockScreen,
// } from "./dialog.js";

// export default {
//   install(app) {
//     // Mount UiContainer once globally
//     const container = document.createElement("div");
//     document.body.appendChild(container);
//     render(h(UiContainer), container);

//     // Expose helpers to all components
//     app.config.globalProperties.$toast = toast;
//     app.config.globalProperties.$alert = alertDialog;
//     app.config.globalProperties.$confirm = confirmDialog;
//     app.config.globalProperties.$block = blockScreen;
//     app.config.globalProperties.$unblock = unblockScreen;
//   },
// };
