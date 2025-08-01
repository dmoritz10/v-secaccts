<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!accountStore.isLoaded || !filteredAccounts"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(filteredAccounts)">
      <v-row
        class="mx-0 pa-0 py-0 pb-2"
        :style="{ backgroundColor: '#f5f5f9' }"
      >
        <v-col cols="12" class="pb-0">
          <v-toolbar flat color="transparent">
            <v-toolbar-title class="text-h5"
              >{{ categoryName }} Accounts</v-toolbar-title
            >
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="returnToCategories"
              >Return to Categories</v-btn
            >
          </v-toolbar>
          <v-text-field
            v-model="accountStore.searchQuery"
            label="Search Accounts"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
            class="mb-4"
          ></v-text-field>
        </v-col>
      </v-row>
      <div class="account-stats">
        <span
          >{{ accountStore.numberOfFilteredAccounts(categoryId) }}
          {{
            accountStore.numberOfFilteredAccounts(categoryId) === 1
              ? "Account"
              : "Accounts"
          }}</span
        >
      </div>
      <div
        v-if="accountStore.numberOfFilteredAccounts(categoryId) === 0"
        class="no-accounts"
      >
        No accounts found. Add one to get started!
      </div>
      <v-row
        dense
        class="mx-0 pa-0 mt-0 mb-3 pt-2"
        v-for="acct in filteredAccounts"
        :key="acct.id"
      >
        <v-col cols="12" sm="6" md="4">
          <v-card
            :id="'account-' + acct.id"
            @click="goToAccount(acct.id)"
            class="account-card"
          >
            <v-card-title class="wrap-card-title">{{
              acct.provider || "Unnamed Account"
            }}</v-card-title>
            <v-card-text>
              <p v-if="acct.notes">{{ acct.notes }}</p>
              <a
                v-if="acct.loginUrl"
                :href="acct.loginUrl"
                target="_blank"
                rel="noopener noreferrer"
                >Login URL</a
              >
            </v-card-text>
            <v-card-actions>
              <v-btn
                color="primary"
                @click.stop="accountStore.openAccountDialog(acct, categoryId)"
                >Edit</v-btn
              >
              <v-btn
                color="error"
                @click.stop="accountStore.deleteAccount(acct.id)"
                >Delete</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
      <v-btn
        color="primary"
        @click="accountStore.openAccountDialog(null, categoryId)"
      >
        <v-icon left>mdi-plus</v-icon> Add Account
      </v-btn>
    </template>
    <div v-else>
      <p>
        Error: Failed to load accounts. Please check your connection and try
        again.
      </p>
    </div>

    <!-- Account Dialog -->
    <AccountDialog
      v-model="accountStore.dialog"
      :form-data="accountStore.formData"
      :category-name="categoryName"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </v-container>
</template>

<script setup>
import { computed, watch, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAccountStore } from "@/stores/account";
import AccountDialog from "@/components/AccountDialog.vue";

const route = useRoute();
const router = useRouter();
const accountStore = useAccountStore();

const categoryId = computed(() => route.query.id || "");
const categoryName = computed(() => route.query.name || "Category");
const filteredAccounts = computed(() =>
  accountStore.filteredAccounts(categoryId.value)
);

onMounted(async () => {
  try {
    console.log("Accounts.vue mounted, fetching data...");
    await Promise.all([
      accountStore.fetchAccounts(),
      accountStore.subscribeToAccounts(),
    ]);
    console.log("Accounts.vue initial fetch complete");
  } catch (error) {
    console.error("Accounts.vue onMounted failed:", error);
  }
});

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
        console.log(`Scrolled to account: ${scrollTo}`);
      } else {
        console.warn(`Account element not found: account-${scrollTo}`);
      }
    });
  }
};

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    nextTick(() => {
      console.log(
        "Accounts.vue watch triggered, scrollTo:",
        newQuery.scrollTo,
        "ts:",
        newQuery.ts
      );
      scrollToAccount(newQuery.scrollTo);
    });
  },
  { immediate: true, deep: true }
);

const returnToCategories = () => {
  router.push({
    path: "/categories",
    query: { scrollTo: categoryId.value, ts: Date.now() },
  });
};

const goToAccount = (accountId) => {
  if (!accountId) return;
  router.push({
    path: `/account/${accountId}`,
    query: { ...route.query, ts: Date.now() },
  });
};

const handleSave = async (payload) => {
  try {
    console.log("Accounts.vue handleSave, payload:", payload);
    const savedAccountId = await accountStore.saveAccount();
    console.log("Saved account ID:", savedAccountId);
    await accountStore.fetchAccounts();
    await nextTick();
    await nextTick();
    accountStore.closeAccountDialog(payload.categoryId || categoryId.value);
    const targetId = payload.accountId ? payload.accountId : savedAccountId;
    if (targetId && typeof targetId === "string") {
      router.push({
        path: "/accounts",
        query: {
          id: payload.categoryId || categoryId.value,
          name: payload.categoryName || categoryName.value,
          scrollTo: targetId,
          ts: Date.now(),
        },
      });
    } else {
      console.warn("Invalid accountId:", targetId);
      router.push({
        path: "/accounts",
        query: {
          id: payload.categoryId || categoryId.value,
          name: payload.categoryName || categoryName.value,
          ts: Date.now(),
        },
      });
    }
  } catch (error) {
    console.error("Accounts.vue handleSave failed:", error);
  }
};

const handleCancel = (payload) => {
  console.log("Accounts.vue handleCancel, payload:", payload);
  const targetId = payload.accountId;
  accountStore.closeAccountDialog(payload.categoryId || categoryId.value);
  if (targetId && typeof targetId === "string") {
    router.push({
      path: "/accounts",
      query: {
        id: payload.categoryId || categoryId.value,
        name: payload.categoryName || categoryName.value,
        scrollTo: targetId,
        ts: Date.now(),
      },
    });
  } else {
    router.push({
      path: "/accounts",
      query: {
        id: payload.categoryId || categoryId.value,
        name: payload.categoryName || categoryName.value,
        ts: Date.now(),
      },
    });
  }
};
</script>

<style scoped src="@/assets/index.css"></style>
