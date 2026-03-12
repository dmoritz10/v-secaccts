<template>
  <!-- Snackbar -->
  <v-snackbar
    v-model="state.snackbar.visible"
    :color="state.snackbar.color"
    :timeout="state.snackbar.timeout"
    location="bottom">
    {{ state.snackbar.message }}
  </v-snackbar>

  <!-- Alert Dialog -->
  <v-dialog v-model="state.alert.visible" persistent max-width="400">
    <v-card>
      <v-card-title class="text-h6" v-html="state.alert.title"></v-card-title>
      <v-card-text v-html="state.alert.message"></v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="onAlert()">
          {{ state.alert.okText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Confirm Dialog -->
  <v-dialog v-model="state.confirm.visible" persistent max-width="420">
    <v-card>
      <v-card-title class="text-h6" v-html="state.confirm.title"></v-card-title>
      <v-card-text v-html="state.confirm.message"></v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="onConfirm(true)">
          {{ state.confirm.okText }}
        </v-btn>
        <v-btn color="secondary" variant="text" @click="onConfirm(false)">
          {{ state.confirm.cancelText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Prompt Dialog -->
  <v-dialog v-model="state.prompt.visible" persistent max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ state.prompt.title }}</v-card-title>
      <v-card-text>
        <div v-html="state.prompt.message" class="mb-3"></div>
        <v-text-field v-model="state.prompt.input" :label="state.prompt.label" hide-details />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="onPrompt(true)">
          {{ state.prompt.okText }}
        </v-btn>
        <v-btn color="secondary" variant="text" @click="onPrompt(false)">
          {{ state.prompt.cancelText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Block Screen Overlay -->
  <!-- This is a 'more modern' approach to the one in older projects -->
  <v-overlay
    v-model="state.block.visible"
    class="align-center justify-center"
    persistent
    :scrim="false"
    style="background: rgba(0, 0, 0, 0.5)">
    <div class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" width="6"></v-progress-circular>

      <div class="text-white mt-4 font-weight-bold text-h6">
        {{ state.block.message }}
      </div>
    </div>
  </v-overlay>
</template>

<script setup>
import { state } from '@/ui/dialogState.js'; // 👈 adjust path if needed

const onAlert = (result) => {
  state.alert.resolve(true);
  state.alert.visible = false;
};

const onConfirm = (result) => {
  if (state.confirm.resolve) state.confirm.resolve(result);
  state.confirm.visible = false;
};

const onPrompt = (ok) => {
  if (state.prompt.resolve) {
    state.prompt.resolve(ok ? state.prompt.input : null);
  }
  state.prompt.visible = false;
};
</script>
