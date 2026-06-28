<template>
  <v-container fluid class="h-100 ma-0 pa-0 responsive-container">
    <template v-if="documentStore.isLoaded && textIsLoaded">
      <v-row class="position-sticky top-0 mx-0 px-0 mb-2 pb-2 grey lighten-4" style="z-index: 20">
        <v-col cols="12" class="pb-0 px-0">
          <v-sheet class="mx-3 px-4 pt-3 pb-3 mt-1 mb-0 border" elevation="0" rounded>
            <v-row class="align-center">
              <v-col cols="1">
                <v-icon size="32" color="black" style="cursor: pointer" @click="returnToDocuments">
                  mdi-chevron-left
                </v-icon>
              </v-col>
              <v-col class="text-center">
                <h2 class="subtitle-1 grey--text text-center">
                  {{ currentDocument?.name }}
                </h2>
              </v-col>
              <!-- Sandwich / 3-dot menu -->
              <v-col cols="1" class="d-flex justify-end"></v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>
      <v-card class="account-details grey lighten-4">
        <v-card-text class="tight-card-text">
          <v-table density="compact" class="compressed-table">
            <tbody>
              <tr>
                <td class="text-green-darken-3 font-weight-bold">Category</td>
                <td>
                  <h3>
                    {{ docCategoryStore.docCategoryNameFor(currentDocument?.docCategoryId) }}
                  </h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(docCategoryNameFor(currentDocument?.docCategoryId) || 'N/A', 'Category')
                    "></v-icon>
                </td>
              </tr>

              <tr v-if="currentDocument?.favorite">
                <td class="text-green-darken-3 font-weight-bold">Favorite</td>
                <td>
                  <h3>{{ currentDocument?.favorite ? 'Yes' : 'No' }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.favorite ? 'Yes' : 'No', 'Favorite')"></v-icon>
                </td>
              </tr>

              <tr v-if="currentDocument?.docNbr">
                <td class="text-green-darken-3 font-weight-bold">Doc Nbr</td>
                <td>
                  <h3>{{ currentDocument?.docNbr }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.docNbr, 'Doc Nbr')"></v-icon>
                </td>
              </tr>
              <tr v-if="currentDocument?.pinNbr">
                <td class="text-green-darken-3 font-weight-bold">Pin Nbr</td>
                <td>
                  <h3>{{ currentDocument?.pinNbr }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.pinNbr, 'Pin Nbr')"></v-icon>
                </td>
              </tr>
              <tr v-if="currentDocument?.expiry">
                <td class="text-green-darken-3 font-weight-bold">Expiry</td>
                <td>
                  <h3>{{ currentDocument?.expiry }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.expiry, 'Expiry')"></v-icon>
                </td>
              </tr>
              <tr v-if="currentDocument?.notes">
                <td class="text-green-darken-3 font-weight-bold">Notes</td>
                <td>
                  <h3>{{ currentDocument?.notes }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.notes, 'Notes')"></v-icon>
                </td>
              </tr>
              <tr v-if="currentDocument?.frontPath">
                <td class="text-green-darken-3 font-weight-bold">Front</td>
                <td>
                  <div class="preview-wrapper">
                    <img :src="frontPreviewUrl" class="doc-thumb" @click="viewFile(frontFullUrl)" />
                    <v-chip v-if="currentDocument.frontType === 'application/pdf'" size="x-small" class="pdf-badge">
                      PDF
                    </v-chip>
                  </div>
                </td>
                <td class="icon-cell">
                  <v-icon size="small" icon="mdi-open-in-new" @click="viewFile(frontFullUrl)"></v-icon>
                </td>
              </tr>

              <tr v-if="currentDocument?.backPath">
                <td class="text-green-darken-3 font-weight-bold">Back</td>
                <td>
                  <div class="preview-wrapper">
                    <img :src="backPreviewUrl" class="doc-thumb" @click="viewFile(backFullUrl)" />
                    <v-chip v-if="currentDocument.backType === 'application/pdf'" size="x-small" class="pdf-badge">
                      PDF
                    </v-chip>
                  </div>
                </td>
                <td class="icon-cell">
                  <v-icon size="small" icon="mdi-open-in-new" @click="viewFile(backFullUrl)"></v-icon>
                </td>
              </tr>

              <tr v-if="currentDocument?.lastChange">
                <td class="text-green-darken-3 font-weight-bold">Last Change</td>
                <td>
                  <h3>{{ currentDocument?.lastChange }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.lastChange, 'Last Change')"></v-icon>
                </td>
              </tr>
              <tr v-if="currentDocument?.dateAdd">
                <td class="text-green-darken-3 font-weight-bold">Date Add</td>
                <td>
                  <h3>{{ currentDocument?.dateAdd }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentDocument?.dateAdd, 'Last Change')"></v-icon>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
      <v-footer app class="justify-center pa-3 grey lighten-4">
        <v-btn-group class="rounded-2xl shadow-md bg-blue p-1" variant="tonal" color="primary" density="compact">
          <v-btn :disabled="!previousAccount" color="white" @click="navigateToDocument(previousAccount?.id)">
            Prev
          </v-btn>
          <v-btn color="white" @click="openUpdateDialog(currentDocument)">Update</v-btn>
          <v-btn :disabled="!nextAccount" color="white" @click="navigateToDocument(nextAccount?.id)">Next</v-btn>
        </v-btn-group>
      </v-footer>

      <!-- Update Dialog -->
      <!-- Account Dialog -->
      <DocumentDialog
        v-model="documentStore.dialog"
        :form-data="documentStore.state.formData"
        @save="($event) => handleSave($event)"
        @cancel="documentStore.closeDocumentDialog" />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, nextTick, ref, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentStore } from '@/stores/document';
import { useDocCategoryStore } from '@/stores/docCategory';
import DocumentDialog from '@/components/DocumentDialog.vue';
import { renderPdfThumbnail } from '@/services/pdfThumbnail';
import { decryptAcctReactive } from '@/services/common';
import { until } from '@vueuse/core';
import { toast, alertDialog } from '@/ui/dialogState.js';
import { dayjs } from '@/services/common';

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentStore();
const docCategoryStore = useDocCategoryStore();

const textIsLoaded = ref(false);
const filesAreLoaded = ref(false);

const frontPreviewUrl = ref(null); // thumbnail, for inline <img>
const frontFullUrl = ref(null); // full file, for "View" button
const backPreviewUrl = ref(null);
const backFullUrl = ref(null);

const idx = computed(() => documentStore.state.items.findIndex((acct) => acct.id === route.params.documentId));

const currentDocument = computed(() => {
  const acct = documentStore.state.items[idx.value];
  const rtn = acct ? { ...acct } : null;
  return rtn;
});

function revokePreviews() {
  [frontFullUrl, backFullUrl].forEach((r) => {
    if (r.value) URL.revokeObjectURL(r.value);
    r.value = null;
  });
  frontPreviewUrl.value = null; // may be a data URL (PDF thumb) — nothing to revoke
  backPreviewUrl.value = null;
}

async function loadFilePreviews(doc) {
  revokePreviews();
  if (!doc) return;

  if (doc.frontPath) {
    try {
      const blob = await documentStore.downloadDocumentFile(doc.frontPath, doc.frontType);
      frontFullUrl.value = URL.createObjectURL(blob);
      frontPreviewUrl.value = doc.frontType === 'application/pdf' ? await renderPdfThumbnail(blob) : frontFullUrl.value;
    } catch (e) {
      console.error('Failed to load front file:', e);
    }
  }

  if (doc.backPath) {
    try {
      const blob = await documentStore.downloadDocumentFile(doc.backPath, doc.backType);
      backFullUrl.value = URL.createObjectURL(blob);
      backPreviewUrl.value = doc.backType === 'application/pdf' ? await renderPdfThumbnail(blob) : backFullUrl.value;
    } catch (e) {
      console.error('Failed to load back file:', e);
    }
  }
}

const frontIsImage = computed(() => currentDocument.value?.frontType?.startsWith('image/'));
const backIsImage = computed(() => currentDocument.value?.backType?.startsWith('image/'));

function viewFile(url) {
  if (!url) return;
  window.open(url, '_blank');
}

watch(
  currentDocument,
  async () => {
    textIsLoaded.value = false;
    filesAreLoaded.value = false;

    await decryptAcctReactive(currentDocument.value);
    textIsLoaded.value = true; // text ready — render the form now

    await loadFilePreviews(currentDocument.value);
    filesAreLoaded.value = true; // images ready — render them now
  },
  { immediate: true }
);
onBeforeUnmount(() => {
  revokePreviews();
});

const filteredDocuments = computed(() => documentStore.filteredDocuments);

const currentIndex = computed(() => {
  const accountId = route.params.documentId;
  return filteredDocuments.value.findIndex((acct) => acct.id === accountId);
});

const previousAccount = computed(() => {
  const index = currentIndex.value;
  return index > 0 ? filteredDocuments.value[index - 1] : null;
});

const nextAccount = computed(() => {
  const index = currentIndex.value;
  return index < filteredDocuments.value.length - 1 ? filteredDocuments.value[index + 1] : null;
});

const copyToClipboard = async (text, fieldName) => {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 3000);
  } catch (error) {
    console.error('ShowDocument.vue: Failed to copy to clipboard:', error);
    alertDialog('ShowDocument.vue: Failed to copy to clipboard', error);
  }
};

onMounted(async () => {
  console.log('ShowDocument onMounted');

  // Wait until currentDocument is defined
  await until(() => documentStore.state.items.length > 0);

  console.log('onMount complete');
});

const returnToDocuments = () => {
  router.push({
    path: '/documents',
    query: {
      id: currentDocument.value.docCategoryId,
      name: docCategoryStore.docCategoryNameFor(currentDocument.value.docCategoryId),
      scrollTo: currentDocument.value.id,
      ts: Date.now(),
    },
  });
};

const navigateToDocument = (accountId) => {
  console.log('navigateToDocument', accountId, route.query);
  if (!accountId) return;
  router.push({ path: `/document/${accountId}`, query: route.query });
};

const openUpdateDialog = (account) => {
  console.log('openUpdateDialog', account);
  documentStore.openDocumentDialog(account);
};

const handleSave = async (formData) => {
  try {
    await documentStore.saveDocument(formData);
    await nextTick();
    documentStore.closeDocumentDialog();
    router.push({
      path: '/documents',
      query: {
        id: formData.docCategoryId,
        name: docCategoryStore.docCategoryNameFor(formData.docCategoryId),
        scrollTo: formData.documentId,
        ts: Date.now(),
      },
    });
  } catch (error) {
    console.error('ShowDocument.vue save document failed:', error);
    alertDialog('ShowDocument.vue save document failed', error);
  }
};
</script>

<style scoped>
.responsive-container {
  width: 100%;
  max-width: 100% !important; /* Force container to fit viewport */
  margin: 0;
  padding: 0;
}
.account-details {
  width: 100%;
  max-width: 100% !important; /* Force card to fit viewport */
  margin: 0;
  padding: 10px;
  box-shadow: none; /* Optional: Remove default card shadow */
}
.tight-card-text {
  padding: 4px !important; /* Reduce padding to maximize table space */
}
.icon-cell {
  padding: 4px !important;
}

.compressed-table :deep(tr) {
  height: 36px;
}
.compressed-table :deep(td) {
  padding: 4px 8px;
  font-size: 0.875rem;
}
.compressed-table {
  width: 100%;
  max-width: 100% !important; /* Force table to fit viewport */
  table-layout: fixed;
}
.compressed-table :deep(td:first-child) {
  width: 12px !important; /* Fixed width for label column */
  padding-right: 0px;
}
.compressed-table :deep(td:nth-child(2)) {
  width: 100%; /* Take remaining space */
  word-break: break-all; /* Aggressively wrap long content */
  max-width: calc(100% - 168px); /* 120px (first) + 48px (third) */
}
.compressed-table :deep(.icon-cell) {
  width: 48px; /* Fixed width for copy icon */
  text-align: center;
}
.doc-thumb {
  max-width: 100px;
  max-height: 100px;
  object-fit: contain;
  border-radius: 4px;
  cursor: pointer;
}
</style>
