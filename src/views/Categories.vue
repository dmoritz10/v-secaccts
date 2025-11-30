<template>
  <v-container fluid class="h-100 ma-0 pa-0">
    <v-progress-circular
      v-if="!categoryStore.isLoaded"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(categoryStore.filteredCategories)">
      <v-container fluid class="ma-0 pa-0" style="height: 100%; overflow: visible">
        <!-- sheet -->
        <v-row class="position-sticky top-0 mx-0 px-0 mb-2" style="z-index: 20; background-color: #f9f9f9">
          <v-col cols="12" class="pb-0 px-0">
            <v-sheet class="mx-3 px-4 pt-6 pb-3 mt-1 mb-0 border" elevation="0" rounded>
              <v-row class="align-center">
                <v-col cols="1"></v-col>
                <v-col class="text-center">
                  <h1 class="subtitle-1 grey--text text-center">Secure Accounts</h1>
                </v-col>
                <!-- Sandwich / 3-dot menu -->
                <v-col cols="1" class="d-flex justify-end">
                  <v-menu location="bottom-end">
                    <template #activator="{ props }">
                      <v-btn icon v-bind="props" variant="text">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>

                    <v-list>
                      <v-list-item v-if="authStore.currUser.admin" @click="openChangePasswordDialog">
                        <v-list-item-title>Change password</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="goToAllAccounts">
                        <v-list-item-title>Show all Accounts</v-list-item-title>
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
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col class="text-center ma-0 pa-0">
                  <h2 class="text-success ma-0 pa-0">
                    {{ categoryStore.numberOfFilteredCategories }}
                  </h2>
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- search -->
        <!-- :model-value="categoryStore.searchQuery" -->
        <!-- @update:modelValue="categoryStore.searchQuery = $event" -->
        <v-row class="mx-0 px-0 my-0 pb-1" style="background-color: #f9f9f9">
          <v-col cols="12" class="pb-0">
            <v-text-field
              v-model="categoryStore.searchQuery"
              label="Search Categories by Account Providers"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="search-field border rounded"
              hide-details
              height="20"
              elevation="0"
              style="background-color: white"
            />
          </v-col>
        </v-row>

        <!-- cards -->
        <v-row dense class="mx-0 px-0 mt-0 mb-3 pt-2" style="background-color: #f9f9f9">
          <v-col v-for="category in categoryStore.filteredCategories" :key="category.id" cols="12">
            <v-card
              elevation="2"
              class="d-flex align-center pa-2 mx-3"
              color="amber-lighten-4"
              :id="`category-${category.id}`"
              @click="goToCategoryAccounts(category.id)"
            >
              <v-card-title class="text-h6 wrap-card-title">
                {{ category.name }}
              </v-card-title>
              <v-spacer></v-spacer>
              <v-btn
                flat
                outlined
                :class="['crypt-btn', 'close-btn', category.enc ? 'bg-red-lighten-2' : 'bg-green-lighten-2']"
                @click.stop="cryptCat(category)"
              >
                {{ category.enc ? "decrypt" : "encrypt" }} </v-btn
              ><v-btn
                icon
                small
                flat
                outlined
                class="transparent-btn close-btn py-1"
                @click.stop="categoryStore.openCategoryDialog(category)"
              >
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn
                v-if="authStore.currUser.admin"
                icon
                small
                outlined
                class="transparent-btn close-btn"
                @click.stop="categoryStore.deleteCategory(category.id)"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
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
        @click="categoryStore.openCategoryDialog()"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </template>
    <!-- Category Dialog -->
    <CategoryDialog
      v-model="categoryStore.dialog"
      :form-data="categoryStore.state.formData"
      @save="categoryStore.saveCategory"
      @cancel="categoryStore.closeCategoryDialog"
    />
    <!-- Change password Dialog -->
    <template>
      <v-btn @click="openChangePasswordDialog">Change Password</v-btn>
      <PasswordChangeDialog ref="pwdDialog" />
    </template>
  </v-container>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCategoryStore } from "@/stores/category";
import { useAccountStore } from "@/stores/account";
import { useAuthStore } from "@/stores/auth";
import { auth } from "../firebase";
import { signOut, getIdToken } from "firebase/auth";
import CategoryDialog from "@/components/CategoryDialog.vue";
import PasswordChangeDialog from "@/components/PasswordChangeDialog.vue";
import { alertDialog } from "@/ui/dialogState.js";
import { encryptCat, decryptCat } from "@/services/common";
import { clearKey } from "@/services/keyVault";
import { marked } from "marked";
import { getStorage } from "firebase/storage";
import { getApp } from "firebase/app";

const router = useRouter();
const route = useRoute();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const authStore = useAuthStore();
const pwdDialog = ref(null);

function openChangePasswordDialog() {
  pwdDialog.value.open();
}

onMounted(async () => {
  console.log("Categories.vue mounted, isLoaded:", categoryStore.isLoaded);
  try {
    await categoryStore.subscribeToCategories();
  } catch (error) {
    console.error("Categories.vue subscribeToCategories failed:", error);
    alertDialog("Categories.vue subscribeToCategories failed", error);
  }
  try {
    await accountStore.subscribeToAccounts();
  } catch (error) {
    console.error("accountStore subscribeToAccounts failed:", error);
    alertDialog("accountStore subscribeToAccounts failed", error);
  }
  console.log("catefories.vue. onMounted complete");
});

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    if (newQuery.scrollTo) {
      nextTick(() => {
        scrollToCategory(newQuery.scrollTo);
      });
    } else {
      console.log("Categories.vue watch triggered, no scrollTo, initial load or no scroll needed");
    }
  },
  { immediate: true, deep: true }
);

// Navigate to a specific category
const goToCategoryAccounts = (catId) => {
  // Set categoryId in the store
  accountStore.selectedCatId = catId;
  // Reset filters so no previous filter is applied
  accountStore.setFilters([]);
  // Navigate to Accounts.vue
  router.push({
    path: `/accounts`,
    query: {
      id: catId,
      name: categoryStore.categoryNameFor(catId),
      ts: Date.now(),
    },
  });
};

// Navigate to All Accounts
const goToAllAccounts = () => {
  // Clear categoryId in the store to show all accounts
  accountStore.selectedCatId = "";
  // Reset filters
  accountStore.setFilters([]);
  // Navigate to Accounts.vue
  router.push("/accounts");
};

const scrollToCategory = (scrollTo) => {
  if (scrollTo && typeof scrollTo === "string") {
    nextTick(() => {
      const container = document.querySelector(".v-container");
      if (container) container.scrollTop = 0;
      document.querySelectorAll(".category-card").forEach((el) => {
        el.classList.remove("sheets-focus");
      });
      const element = document.getElementById(`category-${scrollTo}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        element.classList.add("sheets-focus");
      } else {
        console.warn(`Categories.vue category element not found: category-${scrollTo}`);
      }
    });
  } else {
    console.log("Categories.vue scrollToCategory, no scrollTo provided:", scrollTo);
  }
};

const handleSignOut = async () => {
  try {
    await signOut(auth);
    authStore.clearUser();
    clearKey();
    router.replace("/");
    console.log("Sign-out successful");
  } catch (error) {
    console.error("Sign-out error:", error);
    authStore.clearUser();
    clearKey();
    router.replace("/");
  }
};

const cryptCat = async (cat) => {
  if (cat.enc) {
    await decryptCat(cat);
  } else await encryptCat(cat);
};

const about = async () => {
  const res = await fetch("/about.md");
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching about.md`);
  const markdown = await res.text();
  // Convert Markdown → HTML
  const html = marked.parse(markdown);
  alertDialog("About Secure Accounts", html);
};

async function debugAuth() {
  auth.currentUser
    ?.getIdToken(true)
    .then((token) => console.log("Token refreshed successfully"))
    .catch((err) => console.error("Token refresh failed", err));

  const storage = getStorage(getApp());
  console.log("Resolved bucket:", storage.bucket);
}
</script>

<style scoped>
.crypt-btn {
  font-size: 12px !important; /* Smaller text for account buttons */
  text-transform: lowercase !important; /* Lowercase text */
  font-weight: bold !important; /* Bold text */
  padding-left: 4px !important; /* Reduced left padding */
  padding-right: 4px !important; /* Reduced right padding */
}
</style>
