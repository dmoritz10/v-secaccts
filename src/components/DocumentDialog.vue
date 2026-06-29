<template>
  <v-dialog v-model="modelValue" max-width="500px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center sticky-header border-b mx-2">
        <span>{{ formData.documentId ? 'Edit Document' : 'Add Document' }}</span>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" class="px-0" @click="saveEdit(formData)">Save</v-btn>
        <v-btn color="error" variant="text" class="px-0" @click="$emit('cancel', {})">Cancel</v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="editForm">
          <v-row dense>
            <!-- Category Column (Takes up 8/12 of the width) -->
            <v-col cols="8">
              <v-select
                v-model="formData.docCategoryId"
                label="Category"
                :items="docCategoryStore.state.items"
                item-title="name"
                item-value="id"
                variant="outlined"
                required
                :rules="[(v) => !!v || 'Category is required']"></v-select>
            </v-col>

            <!-- Owner Column (Takes up 4/12 of the width, smaller density) -->
            <v-col cols="4">
              <v-select
                v-model="formData.owner"
                label="Owner"
                :items="['D', 'C']"
                variant="outlined"
                density="compact"
                required
                :rules="[(v) => !!v || 'Required']"></v-select>
            </v-col>
          </v-row>
          <v-text-field
            v-model="formData.name"
            label="Name"
            autocomplete="off"
            autofocus
            variant="outlined"
            :rules="[nameExistsRule]"
            required></v-text-field>

          <v-text-field
            v-model="formData.provider"
            label="Provider"
            autocomplete="off"
            variant="outlined"
            required></v-text-field>
          <v-text-field
            v-model="formData.expiry"
            label="Expiration Date"
            autocomplete="off"
            type="date"
            variant="outlined"
            required
            density="compact"></v-text-field>
          <v-text-field
            v-model="formData.docNbr"
            :label="docNbrFieldLabel"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.pinNbr"
            :label="pinNbrFieldLabel"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-textarea
            v-model="formData.notes"
            label="Notes"
            autocomplete="off"
            variant="outlined"
            clearable></v-textarea>
          <v-checkbox v-model="formData.favorite" label="Favorite"></v-checkbox>

          <!-- Front file section -->
          <div class="file-section">
            <div class="text-subtitle-2 mb-2">Front</div>

            <div v-if="frontPreview" class="file-preview mb-2">
              <div class="preview-wrapper">
                <img :src="frontPreview" class="preview-img" />
                <v-chip
                  v-if="formData.frontFile?.type === 'application/pdf' || formData.frontType === 'application/pdf'"
                  size="x-small"
                  class="pdf-badge">
                  PDF
                </v-chip>
              </div>
              <div class="d-flex flex-column">
                <v-btn v-if="frontIsImage" icon size="small" variant="text" @click="rotateFront(-90)">
                  <v-icon>mdi-rotate-left</v-icon>
                </v-btn>
                <v-btn v-if="frontIsImage" icon size="small" variant="text" @click="rotateFront(90)">
                  <v-icon>mdi-rotate-right</v-icon>
                </v-btn>
                <v-btn
                  v-if="frontHasFile"
                  icon
                  size="small"
                  variant="text"
                  :loading="isAnalyzing"
                  @click="handleMagicFill('front')">
                  <v-icon>mdi-creation</v-icon>
                </v-btn>
                <v-btn icon size="small" variant="text" color="error" @click="clearFront">
                  <v-icon>mdi-close-circle</v-icon>
                </v-btn>
              </div>
            </div>

            <div class="d-flex ga-2">
              <v-btn variant="outlined" size="small" @click="frontFileInput.click()">Choose File</v-btn>
              <v-btn variant="outlined" size="small" @click="frontCameraInput.click()">Take Photo</v-btn>
            </div>

            <input
              ref="frontFileInput"
              type="file"
              accept="image/*,application/pdf"
              hidden
              @change="(e) => handleFileChange(e, 'front')" />
            <input
              ref="frontCameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              @change="(e) => handleFileChange(e, 'front')" />
          </div>

          <!-- Back file section -->
          <div class="file-section">
            <div class="text-subtitle-2 mb-2">Back</div>

            <div v-if="backPreview" class="file-preview mb-2">
              <div class="preview-wrapper">
                <img :src="backPreview" class="preview-img" />
                <v-chip
                  v-if="formData.backFile?.type === 'application/pdf' || formData.backType === 'application/pdf'"
                  size="x-small"
                  class="pdf-badge">
                  PDF
                </v-chip>
              </div>
              <div class="d-flex flex-column">
                <v-btn v-if="backIsImage" icon size="small" variant="text" @click="rotateBack(-90)">
                  <v-icon>mdi-rotate-left</v-icon>
                </v-btn>
                <v-btn v-if="backIsImage" icon size="small" variant="text" @click="rotateBack(90)">
                  <v-icon>mdi-rotate-right</v-icon>
                </v-btn>
                <v-btn
                  v-if="backHasFile"
                  icon
                  size="small"
                  variant="text"
                  :loading="isAnalyzing"
                  @click="handleMagicFill('back')">
                  <v-icon>mdi-creation</v-icon>
                </v-btn>
                <v-btn icon size="small" variant="text" color="error" @click="clearBack">
                  <v-icon>mdi-close-circle</v-icon>
                </v-btn>
              </div>
            </div>

            <div class="d-flex ga-2">
              <v-btn variant="outlined" size="small" @click="backFileInput.click()">Choose File</v-btn>
              <v-btn variant="outlined" size="small" @click="backCameraInput.click()">Take Photo</v-btn>
            </div>

            <input
              ref="backFileInput"
              type="file"
              accept="image/*,application/pdf"
              hidden
              @change="(e) => handleFileChange(e, 'back')" />
            <input
              ref="backCameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              @change="(e) => handleFileChange(e, 'back')" />
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useDocCategoryStore } from '@/stores/docCategory';
import { useDocumentStore } from '@/stores/document';
import { ref, computed, onBeforeUnmount } from 'vue';
import { dayjs } from '@/services/common';
import { alertDialog } from '@/ui/dialogState.js';
import { renderPdfThumbnail } from '@/services/pdfThumbnail';
import { rotateImageBlob } from '@/services/imageRotate';
import { extractDocumentFields } from '@/services/aiExtract';

const docCategoryStore = useDocCategoryStore();
const documentStore = useDocumentStore();
const editForm = ref(null);

const isAnalyzing = ref(false);

const selectedDocCategory = computed(() =>
  docCategoryStore.state.items.find((c) => c.id === props.formData.docCategoryId)
);

const docNbrFieldLabel = computed(() => selectedDocCategory.value?.docNbrFieldLabel || 'Doc Nbr');
const pinNbrFieldLabel = computed(() => selectedDocCategory.value?.pinNbrFieldLabel || 'Pin Nbr');

async function handleMagicFill(side) {
  const blob = side === 'front' ? await getCurrentFrontBlob() : await getCurrentBackBlob();
  if (!blob) return;

  isAnalyzing.value = true;
  try {
    const extracted = await extractDocumentFields(blob, {
      docNbrFieldLabel: docNbrFieldLabel.value,
      pinNbrFieldLabel: pinNbrFieldLabel.value,
    });

    if (extracted.name) props.formData.name = extracted.name;
    if (extracted.provider) props.formData.provider = extracted.provider;
    if (extracted.expiry) props.formData.expiry = extracted.expiry;
    if (extracted.field1) props.formData.docNbr = extracted.field1; // or field1, matching your actual model field name
    if (extracted.field2) props.formData.pinNbr = extracted.field2;

    if (extracted.notes) {
      props.formData.notes = props.formData.notes ? `${props.formData.notes}\n\n${extracted.notes}` : extracted.notes;
    }
  } catch (error) {
    console.error('Magic fill failed:', error);
    alertDialog?.('Could not analyze image', 'Try again, or fill the form manually.');
  } finally {
    isAnalyzing.value = false;
  }
}

const frontFileInput = ref(null);
const frontCameraInput = ref(null);
const backFileInput = ref(null);
const backCameraInput = ref(null);

// Locally-created preview URLs for newly-picked files (not yet saved)
const frontNewPreviewUrl = ref(null);
const backNewPreviewUrl = ref(null);

const nameExistsRule = computed(() => {
  return (value) => {
    if (!value) return 'Document Name is required';
    const normalized = value.trim().toLowerCase();
    const exists = documentStore.state.items.some(
      (item) => item.name.trim().toLowerCase() === normalized && item.id !== props.formData.documentId
    );
    if (exists) return 'This Document name already exists';
    return true;
  };
});

// Preview shown = newly picked file (if any), else existing stored preview, else nothing
const frontPreview = computed(() => frontNewPreviewUrl.value || props.formData.frontPreviewUrl);
const backPreview = computed(() => backNewPreviewUrl.value || props.formData.backPreviewUrl);

const frontHasFile = computed(() => !!(props.formData.frontFile || props.formData.frontPath));
const backHasFile = computed(() => !!(props.formData.backFile || props.formData.backPath));

const frontIsImage = computed(() => {
  const file = props.formData.frontFile;
  if (file) return file.type.startsWith('image/');
  return props.formData.frontType ? props.formData.frontType.startsWith('image/') : true;
});

const backIsImage = computed(() => {
  const file = props.formData.backFile;
  if (file) return file.type.startsWith('image/');
  return props.formData.backType ? props.formData.backType.startsWith('image/') : true;
});

async function convertHeicToJpeg(file) {
  const { default: heic2any } = await import('heic2any');
  const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const newName = file.name.replace(/\.hei[cf]$/i, '.jpg');
  return new File([convertedBlob], newName, { type: 'image/jpeg' });
}

async function getActualFileType(file) {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG: starts with FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // HEIC/HEIF: bytes 4-11 spell "ftyp" followed by a heic/heif/mif1 brand
  const ftypTag = String.fromCharCode(...bytes.slice(4, 8));
  if (ftypTag === 'ftyp') {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1'].includes(brand)) {
      return 'image/heic';
    }
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }

  // PDF: starts with %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  return file.type || null; // fall back to whatever the browser claimed, if we can't identify it
}

async function handleFileChange(event, side) {
  let file = event.target.files?.[0];
  if (!file) return;

  const actualType = await getActualFileType(file);

  // Only convert if the actual bytes are genuinely HEIC
  if (actualType === 'image/heic') {
    try {
      file = await convertHeicToJpeg(file);
    } catch (e) {
      console.error('HEIC conversion failed:', e);
      alertDialog('Image conversion failed', 'Could not convert this HEIC photo. Try a different file.');
      event.target.value = '';
      return;
    }
  } else if (file.type !== actualType && actualType) {
    // File is fine as-is, but its declared type was wrong/empty — fix it
    file = new File([file], file.name, { type: actualType });
  }

  let previewSrc;
  if (file.type === 'application/pdf') {
    try {
      previewSrc = await renderPdfThumbnail(file);
    } catch (e) {
      console.error('Failed to render PDF thumbnail:', e);
      previewSrc = null;
    }
  } else {
    previewSrc = URL.createObjectURL(file);
  }

  if (side === 'front') {
    if (frontNewPreviewUrl.value && frontNewPreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(frontNewPreviewUrl.value);
    }
    frontNewPreviewUrl.value = previewSrc;
    props.formData.frontFile = file;
    props.formData.removeFront = false;
  } else {
    if (backNewPreviewUrl.value && backNewPreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(backNewPreviewUrl.value);
    }
    backNewPreviewUrl.value = previewSrc;
    props.formData.backFile = file;
    props.formData.removeBack = false;
  }

  event.target.value = '';
}

async function getCurrentFrontBlob() {
  if (props.formData.frontFile) return props.formData.frontFile;
  if (props.formData.frontPath) {
    return documentStore.downloadDocumentFile(props.formData.frontPath, props.formData.frontType);
  }
  return null;
}

async function getCurrentBackBlob() {
  if (props.formData.backFile) return props.formData.backFile;
  if (props.formData.backPath) {
    return documentStore.downloadDocumentFile(props.formData.backPath, props.formData.backType);
  }
  return null;
}

async function rotateFront(degrees) {
  const currentBlob = await getCurrentFrontBlob();
  if (!currentBlob) return;

  const rotatedBlob = await rotateImageBlob(currentBlob, degrees);
  const file = new File([rotatedBlob], 'front.jpg', { type: 'image/jpeg' });

  if (frontNewPreviewUrl.value && frontNewPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(frontNewPreviewUrl.value);
  }
  const url = URL.createObjectURL(rotatedBlob);
  frontNewPreviewUrl.value = url;
  props.formData.frontFile = file; // mark as a pending new file, so saveDocument re-uploads it
  props.formData.removeFront = false;
}

async function rotateBack(degrees) {
  const currentBlob = await getCurrentBackBlob();
  if (!currentBlob) return;

  const rotatedBlob = await rotateImageBlob(currentBlob, degrees);
  const file = new File([rotatedBlob], 'back.jpg', { type: 'image/jpeg' });

  if (backNewPreviewUrl.value && backNewPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(backNewPreviewUrl.value);
  }
  const url = URL.createObjectURL(rotatedBlob);
  backNewPreviewUrl.value = url;
  props.formData.backFile = file;
  props.formData.removeBack = false;
}

function clearFront() {
  if (frontNewPreviewUrl.value) {
    URL.revokeObjectURL(frontNewPreviewUrl.value);
    frontNewPreviewUrl.value = null;
  }
  props.formData.frontFile = null;
  props.formData.frontPreviewUrl = null;
  props.formData.removeFront = true;
}

function clearBack() {
  if (backNewPreviewUrl.value) {
    URL.revokeObjectURL(backNewPreviewUrl.value);
    backNewPreviewUrl.value = null;
  }
  props.formData.backFile = null;
  props.formData.backPreviewUrl = null;
  props.formData.removeBack = true;
}

onBeforeUnmount(() => {
  if (frontNewPreviewUrl.value) URL.revokeObjectURL(frontNewPreviewUrl.value);
  if (backNewPreviewUrl.value) URL.revokeObjectURL(backNewPreviewUrl.value);
});

async function saveEdit($event) {
  const { valid } = await editForm.value?.validate();
  if (valid) {
    emit('save', props.formData);
  }
}

const modelValue = defineModel();

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['save', 'cancel']);
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: white;
}

.file-section {
  margin-top: 16px;
  margin-bottom: 16px;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  padding: 8px;
}

.preview-img {
  max-width: 120px;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
}

.pdf-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
}
.preview-wrapper {
  position: relative;
  display: inline-block;
}
.pdf-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
}
</style>
