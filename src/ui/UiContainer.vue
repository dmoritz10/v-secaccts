<template>
  <!-- Snackbar -->
  <v-snackbar
    v-model="state.snackbar.visible"
    :color="state.snackbar.color"
    :timeout="state.snackbar.timeout"
    location="bottom right"
    style="pointer-events: auto"
  >
    {{ state.snackbar.message }}
  </v-snackbar>

  <!-- Alert dialog -->
  <v-dialog v-model="state.alert.visible" persistent>
    <v-card>
      <v-card-title class="text-h6 text-center"><div v-html="state.alert.title"></div></v-card-title>
      <v-card-text><div v-html="state.alert.message"></div></v-card-text>
      <v-card-actions>
        <v-btn @click="state.alert.visible = false">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Confirm dialog -->
  <v-dialog v-model="state.confirm.visible" persistent>
    <v-card>
      <v-card-title class="text-h6 text-center"><div v-html="state.confirm.title"></div></v-card-title>
      <v-card-text><div class="ma-0 pa-0" v-html="state.confirm.message"></div></v-card-text>
      <v-card-actions>
        <v-btn @click="confirm(true)">Yes</v-btn>
        <v-btn @click="confirm(false)">No</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Prompt dialog -->
  <v-dialog v-model="state.prompt.visible" persistent>
    <v-card>
      <v-card-title class="text-h6 text-center">
        <div v-html="state.prompt.title"></div>
      </v-card-title>

      <v-card-text>
        <div v-html="state.prompt.message" class="mb-3"></div>
        <v-text-field
          v-model="state.prompt.input"
          :label="state.prompt.label"
          autofocus
          @keyup.enter="prompt(true)"
        ></v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" @click="prompt(true)">OK</v-btn>
        <v-btn @click="prompt(false)">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Block overlay -->
  <v-overlay
    v-model="state.block.visible"
    persistent
    style="background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center"
  >
    {{ state.block.message }}

    <v-progress-circular indeterminate size="64" color="white"></v-progress-circular>
  </v-overlay>
</template>

<script setup>
import { state } from "./dialogState.js";

function confirm(answer) {
  if (state.confirm.resolve) {
    state.confirm.visible = false;
    state.confirm.resolve(answer);
    state.confirm.resolve = null;
  }
}

function prompt(answer) {
  if (state.prompt.resolve) {
    const inputValue = answer ? state.prompt.input : null;
    state.prompt.visible = false;
    state.prompt.resolve(inputValue);
    state.prompt.resolve = null;
  }
}
</script>
