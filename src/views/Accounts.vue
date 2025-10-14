<template>
  <v-container fluid class="h-100 ma-0 pa-0">
    <v-progress-circular
      v-if="!accountStore.isLoaded || !categoryStore.isLoaded"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(filteredAccounts)">
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
                  <h2 class="subtitle-1 grey--text text-center">
                    {{ categoryName ? categoryName : "All Accounts" }}
                  </h2>
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
                          v-model="accountStore.activeFilters"
                          label="Filter Favorites"
                          value="favorite"
                          hide-details
                          dense
                        />
                      </v-list-item>

                      <v-list-item>
                        <v-checkbox
                          v-model="accountStore.activeFilters"
                          label="Filter AutoPay"
                          value="autoPay"
                          hide-details
                          dense
                        />
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col class="text-center ma-0 pa-0" col="3">
                  <h2 class="text-success ma-0 pa-0">
                    {{ filteredAccounts.length }}
                  </h2>
                  <!-- <p class="subtitle-1 grey--text text-center ma-0 pa-0">
                    Accounts
                  </p> -->
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- search -->
        <!-- :model-value="accountStore.searchQuery" -->
        <!-- @update:modelValue="accountStore.searchQuery = $event" -->
        <v-row class="mx-0 px-0 my-0 pb-1" style="background-color: #f9f9f9">
          <v-col cols="12" class="pb-0">
            <v-text-field
              v-model="accountStore.searchQuery"
              label="Search Providers"
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
          <v-col v-for="account in filteredAccounts" :key="account.id" cols="12">
            <v-card
              elevation="2"
              class="d-flex align-center pa-2 mx-3"
              color="amber-lighten-4"
              :id="'account-' + account.id"
              @click="goToAccount(account)"
            >
              <v-card-title class="text-h6 wrap-card-title">
                {{ account.provider }}
              </v-card-title>
              <v-spacer></v-spacer>
              <v-btn icon small flat outlined class="transparent-btn close-btn">
                <v-icon v-if="account.autoPay">mdi-cash-sync</v-icon>
              </v-btn>
              <v-btn icon small flat outlined class="transparent-btn close-btn">
                <v-icon
                  :color="account.favorite ? 'blue' : undefined"
                  @click.stop="accountStore.toggleFavorite(account.id, account.favorite, account.enc)"
                >
                  {{ account.favorite ? "mdi-star" : "mdi-star-outline" }}
                </v-icon>
              </v-btn>
              <v-btn
                icon
                small
                flat
                outlined
                class="transparent-btn close-btn"
                @click.stop="accountStore.openAccountDialog(account)"
              >
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn
                v-if="authStore.currUser.admin"
                icon
                small
                outlined
                class="transparent-btn close-btn"
                @click.stop="accountStore.deleteAccount(account.id)"
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
        @click="
          accountStore.openAccountDialog({
            categoryId: accountStore.selectedCatId,
          })
        "
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </template>
    <div v-else>
      <p>Error: Failed to load accounts. Please check your connection and try again.</p>
    </div>

    <!-- Account Dialog -->
    <AccountDialog
      v-model="accountStore.dialog"
      :form-data="accountStore.state.formData"
      @save="($event) => handleSave($event)"
      @cancel="accountStore.closeAccountDialog"
    />
  </v-container>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import AccountDialog from "@/components/AccountDialog.vue";
import { useAuthStore } from "@/stores/auth";
import { computed, onMounted, ref, watch, nextTick } from "vue";
import { alertDialog } from "@/ui/dialogState.js";

const router = useRouter();
const route = useRoute();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const authStore = useAuthStore();
const menuOpen = ref(false);
accountStore.setFilters([]);

const categoryIdFromRoute = computed(() => route.query.id || "");
const categoryName = computed(() => route.query.name || "");

onMounted(async () => {
  try {
    if (!accountStore.isLoaded) {
      await accountStore.subscribeToAccounts();
      console.log("Accounts.vue subscribed, accountStore.isLoaded:", accountStore.isLoaded);
    }
  } catch (error) {
    console.error("Accounts.vue subscribeToAccounts failed:", error);
    alertDialog("Accounts subscribeToAccounts failed", error);
  }
  console.log("Accounts.vue. onMounted complete");

  if (categoryStore.searchQuery) {
    accountStore.searchQuery = categoryStore.searchQuery;
  }
});

const filteredAccounts = computed(() => {
  const accounts = accountStore.filteredAccounts;
  return accounts;
});

watch(
  () => categoryIdFromRoute.value,
  async (newId) => {
    await nextTick();
    accountStore.selectedCatId = newId || "";
  },
  { immediate: true }
);

const goToAccount = (account) => {
  router.push({
    path: `/account/${account.id}`,
    query: {
      id: accountStore.selectedCatId,
      name: categoryStore.categoryNameFor(accountStore.selectedCatId),
      ts: Date.now(),
    },
  });
};

const returnToCategories = () => {
  router.push({
    path: "/categories",
    query: { scrollTo: accountStore.selectedCatId, ts: Date.now() },
  });
};

const scrollToAccount = (scrollTo) => {
  if (scrollTo && typeof scrollTo === "string") {
    nextTick(() => {
      const container = document.querySelector(".v-container");
      if (container) container.scrollTop = 0;
      document.querySelectorAll(".account-card").forEach((el) => {
        el.classList.remove("sheets-focus");
      });
      const element = document.getElementById(`account-${scrollTo}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        element.classList.add("sheets-focus");
      } else {
        console.warn(`Accounts.vue account element not found: account-${scrollTo}`);
      }
    });
  } else {
    console.log("Accounts.vue scrollToAccount, no scrollTo provided:", scrollTo);
  }
};

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    if (newQuery.scrollTo) {
      nextTick(() => {
        scrollToAccount(newQuery.scrollTo);
      });
    } else {
      console.log("Accounts.vue watch triggered, no scrollTo, initial load or no scroll needed");
    }
  },
  { immediate: true, deep: true }
);

const handleSave = async (formData) => {
  try {
    const acctId = await accountStore.saveAccount(formData);
    await nextTick();
    accountStore.closeAccountDialog();
    router.push({
      path: "/accounts",
      query: {
        id: formData.categoryId,
        name: categoryStore.categoryNameFor(formData.categoryId),
        scrollTo: acctId,
        ts: Date.now(),
      },
    });
  } catch (error) {
    console.error("Accounts.vue handleSave failed:", error);
    alertDialog("Accounts.vue handleSave failed", error);
  }
};
</script>
