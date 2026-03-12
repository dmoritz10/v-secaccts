import { reactive } from 'vue';

/**
 * Reactive state object for managing dialog and notification UI components.
 *
 * @type {Object}
 * @property {Object} snackbar - Snackbar notification configuration
 * @property {boolean} snackbar.visible - Whether the snackbar is displayed
 * @property {string} snackbar.message - Message text to display
 * @property {string} snackbar.color - Color theme (e.g., "primary")
 * @property {number} snackbar.timeout - Duration in milliseconds before auto-dismiss
 *
 * @property {Object} alert - Alert dialog configuration
 * @property {boolean} alert.visible - Whether the alert is displayed
 * @property {string} alert.title - Alert title text
 * @property {string} alert.message - Alert message text
 * @property {string} alert.okText - Text for the OK button
 *
 * @property {Object} confirm - Confirmation dialog configuration
 * @property {boolean} confirm.visible - Whether the confirmation dialog is displayed
 * @property {string} confirm.title - Confirmation dialog title
 * @property {string} confirm.message - Confirmation message text
 * @property {string} confirm.okText - Text for the OK button
 * @property {string} confirm.cancelText - Text for the Cancel button
 * @property {Function|null} confirm.resolve - Promise resolver function for handling response
 *
 * @property {Object} block - Loading/blocking overlay configuration
 * @property {boolean} block.visible - Whether the block overlay is displayed
 * @property {string} block.message - Message to display during blocking
 *
 * @property {Object} prompt - Prompt input dialog configuration
 * @property {boolean} prompt.visible - Whether the prompt dialog is displayed
 * @property {string} prompt.title - Prompt dialog title
 * @property {string} prompt.message - Prompt message text
 * @property {string} prompt.label - Label for the input field
 * @property {string} prompt.input - Current input value
 * @property {string} prompt.okText - Text for the OK button
 * @property {string} prompt.cancelText - Text for the Cancel button
 * @property {Function|null} prompt.resolve - Promise resolver function for handling response
 */
export const state = reactive({
  snackbar: {
    visible: false,
    message: '',
    color: 'primary',
    timeout: 3000,
  },
  alert: {
    visible: false,
    title: '',
    message: '',
    okText: 'OK',
    resolve: null,
  },
  confirm: {
    visible: false,
    title: '',
    message: '',
    okText: 'OK',
    cancelText: 'Cancel',
    resolve: null,
  },
  block: {
    visible: false,
    message: '',
  },
  prompt: {
    visible: false,
    title: '',
    message: '',
    label: '',
    input: '',
    okText: 'OK',
    cancelText: 'Cancel',
    resolve: null,
  },
});

// 🔔 Snackbar
export const toast = (message, opts = {}) => {
  state.snackbar.message = message;
  state.snackbar.color = opts.color || 'primary';
  state.snackbar.timeout = opts.timeout ?? 3000;
  state.snackbar.visible = true;
};

// ⚠️ Alert dialog
export const alertDialog = (title, message, opts = {}) =>
  new Promise((resolve) => {
    state.alert.title = title;
    state.alert.message = message;
    state.alert.okText = opts.okText || 'OK';
    state.alert.visible = true;
    state.alert.resolve = resolve;
  });

// ❓ Confirm dialog
export const confirmDialog = (title, message, opts = {}) =>
  new Promise((resolve) => {
    state.confirm.title = title;
    state.confirm.message = message;
    state.confirm.okText = opts.okText || 'OK';
    state.confirm.cancelText = opts.cancelText || 'Cancel';
    state.confirm.visible = true;
    state.confirm.resolve = resolve;
  });

// 📝 Prompt dialog
export const promptDialog = (title, message, label = 'Enter value', opts = {}) =>
  new Promise((resolve) => {
    state.prompt.title = title;
    state.prompt.message = message;
    state.prompt.label = label;
    state.prompt.input = '';
    state.prompt.okText = opts.okText || 'OK';
    state.prompt.cancelText = opts.cancelText || 'Cancel';
    state.prompt.visible = true;
    state.prompt.resolve = resolve;
  });

// 🚫 Block overlay
export const blockScreen = (message) => {
  state.block.message = message;
  state.block.visible = true;
};

export const unblockScreen = () => {
  state.block.visible = false;
};
