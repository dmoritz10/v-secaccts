<template>
  <v-dialog v-model="show" max-width="700px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center border-b">
        <span>Crop Image</span>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="handleConfirm">Save</v-btn>
        <v-btn color="error" variant="text" @click="handleCancel">Cancel</v-btn>
      </v-card-title>

      <v-card-text class="pa-2">
        <div class="crop-container">
          <img ref="imageEl" style="max-width: 100%; display: block" />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const show = ref(false);
const imageEl = ref(null);

let cropper = null;
let objectUrlToRevoke = null;
let resolvePromise = null;

function open(sourceUrl, { isObjectUrl = false } = {}) {
  show.value = true;
  objectUrlToRevoke = isObjectUrl ? sourceUrl : null;

  return new Promise((resolve) => {
    resolvePromise = resolve;

    requestAnimationFrame(() => {
      imageEl.value.src = sourceUrl;
      imageEl.value.onload = () => {
        cropper = new Cropper(imageEl.value, {
          viewMode: 1,
          autoCropArea: 1,
          responsive: true,
          background: false,
        });
      };
    });
  });
}

function cleanup() {
  cropper?.destroy();
  cropper = null;
  if (objectUrlToRevoke) {
    URL.revokeObjectURL(objectUrlToRevoke);
    objectUrlToRevoke = null;
  }
  show.value = false;
}

function handleConfirm() {
  if (!cropper) {
    resolvePromise?.(null);
    cleanup();
    return;
  }

  const canvas = cropper.getCroppedCanvas();
  canvas.toBlob(
    (blob) => {
      resolvePromise?.(blob);
      cleanup();
    },
    'image/jpeg',
    0.92
  );
}

function handleCancel() {
  resolvePromise?.(null);
  cleanup();
}

defineExpose({ open });
</script>

<style scoped>
.crop-container {
  max-height: 70vh;
  overflow: hidden;
}
</style>
