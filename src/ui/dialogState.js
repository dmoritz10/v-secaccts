import { reactive } from "vue";

export const state = reactive({
  snackbar: { visible: false, message: "", color: "primary", timeout: 3000 },
  alert: { visible: false, title: "", message: "" },
  confirm: { visible: false, title: "", message: "", resolve: null },
  block: { visible: false, message: "" },
});

// Snackbar
export const toast = (message, opts = {}) => {
  state.snackbar.message = message;
  state.snackbar.color = opts.color || "primary";
  state.snackbar.timeout = opts.timeout ?? 3000;
  state.snackbar.visible = true;
};

// Alert dialog
export const alertDialog = (title, message) => {
  state.alert.title = title;
  state.alert.message = message;
  state.alert.visible = true;
};

// Confirm dialog
export const confirmDialog = (title, message) =>
  new Promise((resolve) => {
    state.confirm.title = title;
    state.confirm.message = message;
    state.confirm.visible = true;
    state.confirm.resolve = resolve;
  });

// Block overlay
export const blockScreen = (message) => {
  state.block.message = message;
  state.block.visible = true;
};

export const unblockScreen = () => {
  state.block.visible = false;
};
