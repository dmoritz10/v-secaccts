<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!state.isLoaded.accounts || !currentAccount"
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
        v-model="state.dialog"
        :form-data="state.formData"
        @save="saveAccount"
        @cancel="closeUpdateDialog"
      />
    </template>
  </v-container>
</template>

<script setup>
import { reactive, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  collection,
  onSnapshot,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase";
import AccountDialog from "@/components/AccountDialog.vue";

const route = useRoute();
const router = useRouter();

const state = reactive({
  accounts: {
    items: [],
    constants: { collectionName: "accounts" },
  },
  isLoaded: {
    accounts: false,
  },
  dialog: false,
  formData: {
    id: null,
    provider: "",
    accountNbr: null,
    autoPay: false,
    categoryId: "",
    enc: false,
    favorite: false,
    login: null,
    loginUrl: "",
    notes: "",
    password: null,
    pinNbr: null,
    securityQA: null,
  },
});

const currentAccount = computed(() => {
  const accountId = route.params.accountId;
  return state.accounts.items.find((acct) => acct.id === accountId) || null;
});

const filteredAccounts = computed(() => {
  const categoryId = route.query.id;
  return state.accounts.items
    .filter(
      (acct) =>
        acct && acct.id && acct.provider && acct.categoryId === categoryId
    )
    .sort((a, b) => a.provider.localeCompare(b.provider));
});

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

const fetchInitialData = async () => {
  console.log("Fetching initial accounts with getDocs in ShowAccount.vue");
  try {
    const accountsSnapshot = await getDocs(
      collection(db, state.accounts.constants.collectionName)
    );
    state.accounts.items = accountsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const item = { id: doc.id, ...data };
        if (!item.id || !item.provider) {
          console.warn("Invalid initial account:", item);
          return null;
        }
        return item;
      })
      .filter((item) => item !== null);
    console.log("Initial accounts fetched:", state.accounts.items);
    state.isLoaded.accounts = true;
  } catch (error) {
    console.error("Error fetching initial accounts:", error);
    state.isLoaded.accounts = true;
  }
};

let unsubscribeAccts = null;
let isFirstAcctsSnapshot = true;

onMounted(async () => {
  await fetchInitialData();

  console.log("Setting up onSnapshot for accounts in ShowAccount.vue");
  unsubscribeAccts = onSnapshot(
    collection(db, state.accounts.constants.collectionName),
    (querySnapshot) => {
      if (isFirstAcctsSnapshot) {
        console.log("Discarding initial accounts onSnapshot");
        isFirstAcctsSnapshot = false;
        return;
      }
      state.accounts.items = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          const item = { id: doc.id, ...data };
          if (!item.id || !item.provider) {
            console.warn("Invalid account document:", item);
            return null;
          }
          return item;
        })
        .filter((item) => item !== null);
      console.log(
        "state.accounts.items updated via onSnapshot:",
        state.accounts.items
      );
    },
    (error) => {
      console.error("Error in accounts onSnapshot:", error);
      state.isLoaded.accounts = true;
    }
  );
});

onUnmounted(() => {
  if (unsubscribeAccts) unsubscribeAccts();
});

const returnToAccounts = () => {
  router.push({
    path: "/accounts",
    query: { ...route.query, scrollTo: route.params.accountId },
  });
};

const navigateToAccount = (accountId) => {
  if (!accountId) return;
  router.push({ path: `/account/${accountId}`, query: route.query });
};

const openUpdateDialog = () => {
  state.formData = {
    id: currentAccount.value.id,
    provider: currentAccount.value.provider || "",
    accountNbr: currentAccount.value.accountNbr || null,
    autoPay: currentAccount.value.autoPay || false,
    categoryId: currentAccount.value.categoryId || route.query.id || "",
    enc: currentAccount.value.enc || false,
    favorite: currentAccount.value.favorite || false,
    login: currentAccount.value.login || null,
    loginUrl: currentAccount.value.loginUrl || "",
    notes: currentAccount.value.notes || "",
    password: currentAccount.value.password || null,
    pinNbr: currentAccount.value.pinNbr || null,
    securityQA: currentAccount.value.securityQA || null,
  };
  state.dialog = true;
};

const closeUpdateDialog = () => {
  state.dialog = false;
  state.formData = {
    id: null,
    provider: "",
    accountNbr: null,
    autoPay: false,
    categoryId: route.query.id || "",
    enc: false,
    favorite: false,
    login: null,
    loginUrl: "",
    notes: "",
    password: null,
    pinNbr: null,
    securityQA: null,
  };
};

const saveAccount = async () => {
  try {
    const {
      id,
      provider,
      accountNbr,
      autoPay,
      categoryId,
      enc,
      favorite,
      login,
      loginUrl,
      notes,
      password,
      pinNbr,
      securityQA,
    } = state.formData;
    if (!provider || !categoryId)
      throw new Error("Provider and category are required");
    const accountData = {
      provider,
      categoryId,
      lastChange: new Date(),
    };
    if (accountNbr !== null) accountData.accountNbr = accountNbr;
    if (autoPay !== null) accountData.autoPay = autoPay;
    if (enc !== null) accountData.enc = enc;
    if (favorite !== null) accountData.favorite = favorite;
    if (login !== null) accountData.login = login;
    if (loginUrl) accountData.loginUrl = loginUrl;
    if (notes) accountData.notes = notes;
    if (password !== null) accountData.password = password;
    if (pinNbr !== null) accountData.pinNbr = pinNbr;
    if (securityQA !== null) accountData.securityQA = securityQA;

    await setDoc(
      doc(db, state.accounts.constants.collectionName, id),
      accountData,
      { merge: true }
    );
    closeUpdateDialog();
    router.push({
      path: "/accounts",
      query: { ...route.query, scrollTo: id },
    });
  } catch (error) {
    console.error("Failed to save account:", error);
  }
};
</script>

<style scoped>
.h-100 {
  height: 100%;
}
.account-details {
  margin-top: 16px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}
.account-details p {
  margin-bottom: 8px;
}
.account-details a {
  color: #1976d2;
  text-decoration: none;
}
.account-details a:hover {
  text-decoration: underline;
}
</style>
