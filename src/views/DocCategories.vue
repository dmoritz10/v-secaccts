<template>
  <v-container fluid class="h-100 ma-0 pa-0">
    <v-progress-circular
      v-if="!docCategoryStore.isLoaded"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"></v-progress-circular>
    <template v-else-if="Array.isArray(docCategoryStore.filteredDocCategories)">
      <v-container fluid class="ma-0 pa-0" style="height: 100%; overflow: visible">
        <v-row class="position-sticky top-0 mx-0 px-0 mb-2" style="z-index: 20; background-color: #f9f9f9">
          <v-col cols="12" class="pb-0 px-0">
            <v-sheet
              class="mx-3 px-4 pt-6 pb-3 mt-1 mb-0 border position-relative"
              style="overflow: visible"
              elevation="0"
              rounded>
              <v-row class="align-center">
                <v-col cols="1" class="d-flex justify-start">
                  <v-menu v-model="menuOpen" content-class="flush-sheet-menu">
                    <template #activator="{ props }">
                      <v-btn icon v-bind="props" variant="text" class="no-capsule">
                        <v-icon>mdi-menu</v-icon>
                      </v-btn>
                    </template>

                    <v-list>
                      <
                      <v-list-item @click="goToAllDocuments">
                        <v-list-item-title>Show all Documents</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="about">
                        <v-list-item-title>About</v-list-item-title>
                      </v-list-item>
                      <v-divider></v-divider>
                      <v-list-item @click="handleSignOut">
                        <v-list-item-title>Sign out</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>

                <v-col class="text-center">
                  <h1 class="subtitle-1 grey--text text-center">Documents</h1>
                </v-col>

                <v-col cols="1" class="d-flex align-center justify-end">
                  <v-btn icon variant="text" class="no-capsule" @click="docCategoryStore.toggleSearch()">
                    <v-icon>{{ docCategoryStore.state.isSearchActive ? 'mdi-close' : 'mdi-magnify' }}</v-icon>
                  </v-btn>
                </v-col>
              </v-row>

              <v-row v-if="docCategoryStore.state.isSearchActive" class="mx-0 mt-3 px-0 w-100">
                <v-col cols="12" class="px-0 py-0">
                  <v-text-field
                    v-model="docCategoryStore.state.searchQuery"
                    placeholder="Search Categories ..."
                    variant="solo-filled"
                    rounded="lg"
                    density="comfortable"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    autofocus
                    @click:clear="onClearSearch" />
                  <div class="text-caption text-center text-grey-darken-1 mt-1">
                    Showing {{ docCategoryStore.filteredDocCategories.length }} of
                    {{ docCategoryStore.state.items.length }}
                  </div>
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <v-row dense class="mx-0 px-0 mt-0 mb-3 pt-2" style="background-color: #f9f9f9">
          <v-col v-for="docCategory in docCategoryStore.filteredDocCategories" :key="docCategory.id" cols="12">
            <v-card
              elevation="2"
              class="d-flex align-center pa-2 mx-3"
              color="amber-lighten-4"
              :id="`docCategory-${docCategory.id}`"
              @click="goToDocCategoryAccounts(docCategory.id)">
              <v-card-title class="text-h6 wrap-card-title">
                {{ docCategory.name }}
              </v-card-title>
              <v-spacer></v-spacer>
              <v-btn
                flat
                outlined
                :class="['crypt-btn', 'close-btn', docCategory.enc ? 'bg-red-lighten-2' : 'bg-green-lighten-2']"
                @click.stop="cryptCat(docCategory)">
                {{ docCategory.enc ? 'decrypt' : 'encrypt' }}
              </v-btn>
              <v-btn
                icon
                small
                flat
                outlined
                class="transparent-btn close-btn py-1"
                @click.stop="docCategoryStore.openDocCategoryDialog(docCategory)">
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn
                v-if="authStore.currUser.admin"
                icon
                small
                outlined
                class="transparent-btn close-btn"
                @click.stop="docCategoryStore.deleteDocCategory(docCategory.id)">
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <v-btn
        icon
        fab
        class="add-btn align-center justify-center"
        style="
          position: fixed;
          bottom: calc(var(--v-layout-bottom, 0px) + 16px);
          left: 50%;
          transform: translateX(-50%);
        "
        @click="docCategoryStore.openDocCategoryDialog()">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </template>

    <DocCategoryDialog
      v-if="docCategoryStore.dialog"
      v-model="docCategoryStore.dialog"
      :docCategory="docCategoryStore.state.selectedDocCategory"
      @save="docCategoryStore.saveDocCategory"
      @cancel="docCategoryStore.closeDocCategoryDialog" />
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useDocCategoryStore } from '@/stores/docCategory';
import { useDocumentStore } from '@/stores/document';
import { useAuthStore } from '@/stores/auth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import DocCategoryDialog from '@/components/DocCategoryDialog.vue';
import { alertDialog } from '@/ui/dialogState.js';
import { encryptCat, decryptCat } from '@/services/common';
import { clearKey } from '@/services/keyVault';
import { marked } from 'marked';
import { getStorage } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { VERSION, BUILD_DATE } from '@/services/version-info.js';

const menuOpen = ref(false);
const router = useRouter();
const route = useRoute();
const docCategoryStore = useDocCategoryStore();
const documentStore = useDocumentStore();
const authStore = useAuthStore();
const pwdDialog = ref(null);

const onClearSearch = () => {
  docCategoryStore.searchQuery = '';
  docCategoryStore.state.isSearchActive = false;
  documentStore.searchQuery = '';
};

onMounted(async () => {
  try {
    await docCategoryStore.subscribeToDocCategories();
  } catch (error) {
    alertDialog('Categories.vue subscribeToDocCategories failed', error);
  }
  try {
    await documentStore.subscribeToDocuments();
  } catch (error) {
    alertDialog('documentStore subscribeToDocuments failed', error);
  }
});

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    if (newQuery.scrollTo) {
      nextTick(() => {
        scrollToDocCategory(newQuery.scrollTo);
      });
    }
  },
  { immediate: true, deep: true }
);

const goToDocCategoryAccounts = (catId) => {
  console.log('goToDocCategoryAccounts');
  documentStore.selectedAllDocs = false;
  documentStore.selectedDocCatId = catId;
  documentStore.setFilters([]);
  router.push({
    path: `/documents`,
    query: {
      id: catId,
      name: docCategoryStore.docCategoryNameFor(catId),
      ts: Date.now(),
    },
  });
};

const goToAllDocuments = () => {
  documentStore.selectedAllDocs = true;
  documentStore.selectedDocCatId = '';
  console.log('goToAllDocuments');
  documentStore.setFilters([]);
  router.push('/documents');
};

const scrollToDocCategory = (scrollTo) => {
  if (scrollTo && typeof scrollTo === 'string') {
    nextTick(() => {
      const container = document.querySelector('.v-container');
      if (container) container.scrollTop = 0;
      document.querySelectorAll('.docCategory-card').forEach((el) => {
        el.classList.remove('sheets-focus');
      });
      const element = document.getElementById(`docCategory-${scrollTo}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        element.classList.add('sheets-focus');
      }
    });
  }
};

const handleSignOut = async () => {
  try {
    await signOut(auth);
    authStore.clearUser();
    clearKey();
    router.replace('/');
  } catch (error) {
    authStore.clearUser();
    clearKey();
    router.replace('/');
  }
};

const cryptCat = async (cat) => {
  if (cat.enc) {
    await decryptCat(cat, 'documents');
  } else await encryptCat(cat, 'documents');
};

const about = async () => {
  const res = await fetch('/about.md');
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching about.md`);
  const markdown = await res.text();
  let html = marked.parse(markdown);
  html = html.replace('VERSION', VERSION).replace('DATE', BUILD_DATE);
  alertDialog('About Secure Accounts', html);
};
</script>

<style scoped>
.crypt-btn {
  font-size: 12px !important;
  text-transform: lowercase !important;
  font-weight: bold !important;
  padding-left: 4px !important;
  padding-right: 4px !important;
}

.no-capsule :deep(.v-btn__overlay),
.no-capsule :deep(.v-btn__underlay) {
  display: none !important;
}

.flush-sheet-menu {
  position: fixed !important;
  left: 12px !important;
  top: 73px !important; /* Adjust this number to match the exact height of your sheet */
}
</style>
