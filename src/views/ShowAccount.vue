<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!accountStore.isLoaded || !currentAccount"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else>
      <v-row
        class="mx-0 pa-0 py-0 pb-2"
        :style="{ backgroundColor: '#f5f5f9' }"
      >
        <v-col cols="12" class="pb-0">
          <v-toolbar flat color="transparent">
            <v-toolbar-title class="text-h5">{{
              currentAccount.provider || "Unnamed Account"
            }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="returnToAccounts"
              >Return to Accounts</v-btn
            >
          </v-toolbar>
        </v-col>
      </v-row>
      <v-card class="account-details">
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6">
              <p>
                <strong>Provider:</strong>
                {{ currentAccount.provider || "N/A" }}
              </p>
              <p>
                <strong>Account Number:</strong>
                {{ currentAccount.accountNbr || "N/A" }}
              </p>
              <p>
                <strong>Auto Pay:</strong>
                {{ currentAccount.autoPay ? "Yes" : "No" }}
              </p>
              <p>
                <strong>Category ID:</strong>
                {{ currentAccount.categoryId || "N/A" }}
              </p>
              <p>
                <strong>Encrypted:</strong>
                {{ currentAccount.enc ? "Yes" : "No" }}
              </p>
              <p>
                <strong>Favorite:</strong>
                {{ currentAccount.favorite ? "Yes" : "No" }}
              </p>
            </v-col>
            <v-col cols="12" sm="6">
              <p>
                <strong>Last Change:</strong>
                {{ formatTimestamp(currentAccount.lastChange) }}
              </p>
              <p><strong>Login:</strong> {{ currentAccount.login || "N/A" }}</p>
              <p>
                <strong>Login URL:</strong>
                <a
                  v-if="currentAccount.loginUrl"
                  :href="currentAccount.loginUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ currentAccount.loginUrl }}</a
                >
                <span v-else>N/A</span>
              </p>
              <p><strong>Notes:</strong> {{ currentAccount.notes || "N/A" }}</p>
              <p>
                <strong>Password:</strong>
                {{ currentAccount.password || "N/A" }}
              </p>
              <p>
                <strong>PIN Number:</strong>
                {{ currentAccount.pinNbr || "N/A" }}
              </p>
              <p>
                <strong>Security Q&A:</strong>
                {{ currentAccount.securityQA || "N/A" }}
              </p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-footer app class="justify-space-between pa-3">
        <v-btn
          :disabled="!previousAccount"
          color="primary"
          @click="navigateToAccount(previousAccount?.id)"
          >Previous</v-btn
        >
        <v-btn color="primary" @click="openUpdateDialog">Update</v-btn>
        <v-btn
          :disabled="!nextAccount"
          color="primary"
          @click="navigateToAccount(nextAccount?.id)"
          >Next</v-btn
        >
      </v-footer>

      <!-- Update Dialog -->
      <AccountDialog
        v-model="accountStore.dialog"
        :form-data="accountStore.formData"
        :category-name="categoryName"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAccountStore } from "@/stores/account";
import AccountDialog from "@/components/AccountDialog.vue";

const route = useRoute();
const router = useRouter();
const accountStore = useAccountStore();

const categoryId = computed(() => route.query.id || "");
const categoryName = computed(() => route.query.name || "Category");
const currentAccount = computed(() => {
  const accountId = route.params.accountId;
  return accountStore.items.find((acct) => acct.id === accountId) || null;
});
const filteredAccounts = computed(() =>
  accountStore.filteredAccounts(categoryId.value)
);
const currentIndex = computed(() => {
  const accountId = route.params.accountId;
  return filteredAccounts.value.findIndex((acct) => acct.id === accountId);
});
const previousAccount = computed(() => {
  const index = currentIndex.value;
  return index > 0 ? filteredAccounts.value[index - 1] : null;
});
const nextAccount = computed(() => {
  const index = currentIndex.value;
  return index < filteredAccounts.value.length - 1
    ? filteredAccounts.value[index + 1]
    : null;
});

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "N/A";
  return timestamp.toDate().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  });
};

onMounted(async () => {
  await accountStore.fetchAccounts();
  accountStore.subscribeToAccounts();
});

const returnToAccounts = () => {
  router.push({
    path: "/accounts",
    query: {
      id: categoryId.value,
      name: categoryName.value,
      scrollTo: route.params.accountId,
    },
  });
};

const navigateToAccount = (accountId) => {
  if (!accountId) return;
  router.push({ path: `/account/${accountId}`, query: route.query });
};

const openUpdateDialog = () => {
  accountStore.openAccountDialog(currentAccount.value, categoryId.value);
};

const handleSave = async ({ categoryId, categoryName, accountId }) => {
  try {
    await accountStore.saveAccount();
    router.push({
      path: "/accounts",
      query: { id: categoryId, name: categoryName, scrollTo: accountId },
    });
  } catch (error) {
    console.error("Save account failed:", error);
  }
};

const handleCancel = ({ categoryId, categoryName, accountId }) => {
  accountStore.closeAccountDialog(categoryId);
  router.push({
    path: "/accounts",
    query: { id: categoryId, name: categoryName, scrollTo: accountId },
  });
};
</script>

<style scoped src="@/assets/index.css"></style>
