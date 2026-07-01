<template>
  <v-container fluid class="h-100 ma-0 pa-0">
    <v-progress-circular
      v-if="!documentStore.isLoaded || !docCategoryStore.isLoaded"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"></v-progress-circular>
    <template v-else-if="Array.isArray(filteredDocuments)">
      <v-container fluid class="ma-0 pa-0">
        <!-- sheet -->
        <v-row class="position-sticky top-0 mx-0 px-0 mb-2" style="z-index: 20; background-color: #f9f9f9">
          <v-col cols="12" class="pb-0 px-0">
            <v-sheet class="mx-3 px-4 pt-6 pb-3 mt-1 mb-0 border" elevation="0" rounded>
              <v-row class="align-center">
                <v-col cols="1">
                  <v-icon size="32" color="black" style="cursor: pointer" @click="returnToCategories">
                    mdi-chevron-left
                  </v-icon>
                </v-col>
                <v-col class="text-center">
                  <h1 style="white-space: pre-line; line-height: 1.2" class="subtitle-1 grey--text text-center">
                    {{ documentStore.selectedAllDocs ? 'All Documents' : documentName }}
                  </h1>
                </v-col>
                <!-- Sandwich / 3-dot menu -->
                <v-col cols="1" class="d-flex justify-end">
                  <v-menu location="bottom-end" v-model="menuOpen">
                    <template #activator="{ props }">
                      <v-btn icon v-bind="props" variant="text">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>

                    <v-list>
                      <v-list-item>
                        <v-checkbox
                          v-model="documentStore.activeFilters"
                          label="Filter Favorites"
                          value="favorite"
                          hide-details
                          dense />
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col class="text-center ma-0 pa-0" col="3">
                  <h2 class="text-success ma-0 pa-0">
                    {{ filteredDocuments.length }}
                  </h2>
                  <!-- <p class="subtitle-1 grey--text text-center ma-0 pa-0">
                    Documents
                  </p> -->
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- search -->
        <!-- :model-value="documentStore.searchQuery" -->
        <!-- @update:modelValue="documentStore.searchQuery = $event" -->
        <v-row class="mx-0 px-0 my-0 pb-1" style="background-color: #f9f9f9">
          <v-col cols="12" class="pb-0">
            <v-text-field
              v-model="documentStore.searchQuery"
              label="Search Documents"
              autocomplete="off"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="search-field border rounded"
              hide-details
              height="20"
              elevation="0"
              style="background-color: white" />
          </v-col>
        </v-row>

        <!-- cards -->
        <v-row dense class="mx-0 px-0 mt-0 mb-3 pt-2" style="background-color: #f9f9f9">
          <v-col v-for="account in filteredDocuments" :key="account.id" cols="12">
            <v-card
              elevation="2"
              class="pa-2 mx-3"
              color="blue-lighten-4"
              variant="elevated"
              :id="'account-' + account.id"
              @click="goToAccount(account)">
              <v-card-title
                class="text-h6 wrap-card-title mb-0 d-flex align-center"
                style="white-space: pre-line; line-height: 1.2">
                <!-- The title text stays on the left -->
                <span>{{ account.name }}</span>
                <!-- ms-auto (margin-start: auto) pushes the chip to the far right -->
                <v-chip
                  v-if="account.owner"
                  class="ms-auto pa-0 ma-0 font-weight-bold d-inline-flex align-center justify-center"
                  style="width: 32px; height: 32px; min-width: 32px; border-radius: 50%"
                  :color="account.owner === 'D' ? 'blue' : 'purple'"
                  variant="tonal">
                  {{ account.owner }}
                </v-chip>
              </v-card-title>
              <v-card-subtitle v-if="documentStore.selectedAllDocs" class="pt-0 mt-n2">
                {{ docCategoryStore.docCategoryNameFor(account.docCategoryId) }}
              </v-card-subtitle>
              <v-card-subtitle v-if="!documentStore.selectedAllDocs" class="pt-0 mt-n2">
                {{ account.provider }}
              </v-card-subtitle>
              <v-row dense justify="end" no-gutters class="mt-n3">
                <v-col cols="1">
                  <v-btn
                    icon
                    small
                    flat
                    outlined
                    class="transparent-btn close-btn"
                    @click.stop="documentStore.cycleFavorite(account.id, account.favorite)">
                    <v-icon :color="account.favorite === true ? 'blue' : account.favorite || undefined">
                      {{ account.favorite ? 'mdi-star' : 'mdi-star-outline' }}
                    </v-icon>
                  </v-btn>
                </v-col>
                <v-col cols="1" class="mx-5">
                  <v-btn
                    icon
                    small
                    flat
                    outlined
                    class="transparent-btn close-btn"
                    @click.stop="documentStore.openDocumentDialog(account)">
                    <v-icon>mdi-pencil-outline</v-icon>
                  </v-btn>
                </v-col>
                <v-col cols="1">
                  <v-btn
                    v-if="authStore.currUser.admin"
                    icon
                    small
                    outlined
                    class="transparent-btn close-btn"
                    @click.stop="documentStore.deleteDocument(account.id)">
                    <v-icon>mdi-delete-outline</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- add button -->
      <v-btn
        icon
        fab
        class="add-btn align-center justify-center"
        style="position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%)"
        @click="
          documentStore.openDocumentDialog({
            docCategoryId: documentStore.selectedDocCatId,
          })
        ">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </template>
    <div v-else>
      <p>Error: Failed to load documents. Please check your connection and try again.</p>
    </div>

    <!-- Account Dialog -->
    <DocumentDialog
      v-if="documentStore.dialog"
      v-model="documentStore.dialog"
      :form-data="documentStore.state.formData"
      @save="($event) => handleSave($event)"
      @cancel="documentStore.closeDocumentDialog" />
  </v-container>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import { useDocumentStore } from '@/stores/document';
import { useDocCategoryStore } from '@/stores/docCategory';
import DocumentDialog from '@/components/DocumentDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { alertDialog } from '@/ui/dialogState.js';

const router = useRouter();
const route = useRoute();
const documentStore = useDocumentStore();
const docCategoryStore = useDocCategoryStore();
const authStore = useAuthStore();
const menuOpen = ref(false);
documentStore.setFilters([]);

const docCategoryIdFromRoute = computed(() => route.query.id || '');
const documentName = computed(() => route.query.name || '');

onMounted(async () => {
  try {
    if (!documentStore.isLoaded) {
      await documentStore.subscribeToAccounts();
      console.log('Documents.vue subscribed, documentStore.isLoaded:', documentStore.isLoaded);
    }
  } catch (error) {
    console.error('Documents.vue subscribeToAccounts failed:', error);
    alertDialog('Documents subscribeToAccounts failed', error);
  }
  console.log('Documents.vue. onMounted complete');

  if (docCategoryStore.searchQuery) {
    documentStore.searchQuery = docCategoryStore.searchQuery;
  } else documentStore.searchQuery = '';
});

const filteredDocuments = computed(() => {
  const accounts = documentStore.filteredDocuments;
  return accounts;
});

watch(
  () => docCategoryIdFromRoute.value,
  async (newId) => {
    await nextTick();
    if (!documentStore.selectedAllDocs) {
      documentStore.selectedDocCatId = newId || '';
    }
  },
  { immediate: true }
);

const goToAccount = (account) => {
  console.log('goToAccount  ', account, documentStore.selectedDocCatId);
  router.push({
    path: `/document/${account.id}`,
    query: {
      id: documentStore.selectedDocCatId,
      name: docCategoryStore.docCategoryNameFor(documentStore.selectedDocCatId),
      ts: Date.now(),
    },
  });
};

const returnToCategories = () => {
  router.push({
    path: '/docCategories',
    query: { scrollTo: documentStore.selectedDocCatId, ts: Date.now() },
  });
};

const scrollToAccount = (scrollTo) => {
  if (scrollTo && typeof scrollTo === 'string') {
    nextTick(() => {
      const container = document.querySelector('.v-container');
      if (container) container.scrollTop = 0;
      document.querySelectorAll('.account-card').forEach((el) => {
        el.classList.remove('sheets-focus');
      });
      const element = document.getElementById(`account-${scrollTo}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        element.classList.add('sheets-focus');
      } else {
        console.warn(`Documents.vue account element not found: account-${scrollTo}`);
      }
    });
  } else {
    console.log('Documents.vue scrollToAccount, no scrollTo provided:', scrollTo);
  }
};

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    if (newQuery.scrollTo) {
      nextTick(() => {
        scrollToAccount(newQuery.scrollTo);
      });
    }
  },
  { immediate: true, deep: true }
);

const handleSave = async (formData) => {
  try {
    const documentId = await documentStore.saveDocument(formData);
    console.log('handleSave', documentId);
    await nextTick();
    documentStore.closeDocumentDialog();
    router.push({
      path: '/documents',
      query: {
        id: formData.docCategoryId,
        name: docCategoryStore.docCategoryNameFor(formData.docCategoryId),
        scrollTo: documentId,
        ts: Date.now(),
      },
    });
  } catch (error) {
    console.error('Documents.vue handleSave failed:', error);
    alertDialog('Documents.vue handleSave failed', error);
  }
};
</script>
