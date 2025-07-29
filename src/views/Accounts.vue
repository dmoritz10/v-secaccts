<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!state.isLoaded.accounts || !filteredAccts"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(filteredAccts)">
      <v-container fluid class="ma-0 pa-0">
        <!-- sheet -->
        <v-row
          class="position-sticky top-0 mx-0 px-0 mb-2"
          style="z-index: 20; background-color: #f9f9f9"
        >
          <v-col cols="12" class="pb-0 px-0">
            <v-sheet
              class="mx-3 px-4 pt-6 pb-5 mt-1 mb-0 border"
              elevation="0"
              rounded
            >
              <v-row class="align-center justify-center">
                <h1 class="subtitle-1 grey--text text-center">
                  {{ categoryName }}
                </h1>
              </v-row>
              <v-row>
                <v-col class="text-center" col="3">
                  <h2 class="text-success">{{ nbrFilteredAccts }}</h2>
                  <p class="subtitle-1 grey--text text-center">Accounts</p>
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- search -->
        <v-row class="mx-0 px-0 my-0 pb-1" style="background-color: #f9f9f9">
          <v-col cols="12" class="pb-0">
            <v-text-field
              v-model="state.accounts.searchQuery"
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
        <v-row
          dense
          class="mx-0 px-0 mt-0 mb-3 pt-2"
          style="background-color: #f9f9f9"
        >
          <v-col v-for="acct in filteredAccts" :key="acct.id" cols="12">
            <v-card
              elevation="2"
              class="d-flex align-center pa-2 mx-3"
              color="amber-lighten-4"
              :id="'account-' + acct.id"
              :class="{
                'sheets-focus': state.accounts.selectedCardId === acct.id,
              }"
              @click="goToAccount(acct.id)"
            >
              <v-card-title class="text-h6 wrap-card-title">
                {{ acct.provider }}
              </v-card-title>
              <v-spacer></v-spacer>
              <v-btn
                icon
                small
                flat
                outlined
                class="transparent-btn close-btn"
                @click.stop="openAccountDialog(acct)"
              >
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn
                icon
                small
                outlined
                class="transparent-btn close-btn"
                @click.stop="deleteAccount(acct.id)"
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
        style="
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
        "
        @click="openAccountDialog"
      >
        <v-icon>mdi-plus</v-icon>
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
      v-model="state.accounts.dialog"
      :form-data="state.accounts.formData"
      @save="saveAccount"
      @cancel="closeAccountDialog"
    />
  </v-container>
</template>

<script setup>
import { reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase";
import AccountDialog from "@/components/AccountDialog.vue";

const route = useRoute();
const router = useRouter();

const state = reactive({
  accounts: {
    items: [], // Ensure empty array
    constants: { collectionName: "accounts" },
    searchQuery: "",
    dialog: false,
    formData: {
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
    },
  },
  isLoaded: {
    accounts: false,
  },
});

const categoryName = computed(() => {
  return route.query.name || "Category";
});

const filteredAccts = computed(() => {
  try {
    const items = Array.isArray(state.accounts.items)
      ? state.accounts.items
      : [];
    const query = state.accounts.searchQuery.toLowerCase();
    const categoryId = route.query.id;
    const accounts = items.filter((acct) => acct && acct.id && acct.provider);
    const filtered = accounts
      .filter((acct) => {
        if (categoryId && acct.categoryId !== categoryId) return false;
        if (!query) return true;
        return (
          acct.provider.toLowerCase().includes(query) ||
          (acct.notes && acct.notes.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => a.provider.localeCompare(b.provider));
    return filtered;
  } catch (error) {
    console.error("Error computing filteredAccts:", error);
    return [];
  }
});

const nbrFilteredAccts = computed(() => {
  console.log(
    "Computing nbrFilteredAccts, filteredAccts:",
    filteredAccts.value
  );
  return filteredAccts.value.length;
});

let unsubscribeAccts = null;
let isFirstAcctsSnapshot = true;

const fetchInitialData = async () => {
  console.log("Fetching initial accounts with getDocs");
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
    state.isLoaded.accounts = true;
  } catch (error) {
    console.error("Error fetching initial accounts:", error);
    state.isLoaded.accounts = true; // Allow error state to display
  }
};

onMounted(async () => {
  await fetchInitialData(); // Fetch initial data

  console.log("Setting up onSnapshot for accounts");
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
      state.isLoaded.accounts = true; // Allow error display
    }
  );

  // Scroll to account if specified in query
  const scrollTo = route.query.scrollTo;
  if (scrollTo) {
    setTimeout(() => {
      const element = document.getElementById(`account-${scrollTo}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        console.log(`Scrolled to account: ${scrollTo}`);
      } else {
        console.warn(`Account element not found: account-${scrollTo}`);
      }
    }, 100); // Delay to ensure DOM is rendered
  }
});

onUnmounted(() => {
  if (unsubscribeAccts) unsubscribeAccts();
});

const returnToCategories = () => {
  router.push({ path: "/categories" });
};

const goToAccount = (accountId) => {
  if (!accountId) return;
  router.push({ path: `/account/${accountId}`, query: route.query });
};

const openAccountDialog = (acct = null) => {
  state.accounts.formData = acct
    ? {
        id: acct.id,
        provider: acct.provider || "",
        accountNbr: acct.accountNbr || null,
        autoPay: acct.autoPay || false,
        categoryId: acct.categoryId || route.query.id || "",
        enc: acct.enc || false,
        favorite: acct.favorite || false,
        login: acct.login || null,
        loginUrl: acct.loginUrl || "",
        notes: acct.notes || "",
        password: acct.password || null,
        pinNbr: acct.pinNbr || null,
        securityQA: acct.securityQA || null,
      }
    : {
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
  state.accounts.dialog = true;
};

const closeAccountDialog = () => {
  state.accounts.dialog = false;
  state.accounts.formData = {
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

const deleteAccount = async (id) => {
  if (!id) return;
  try {
    await deleteDoc(doc(db, state.accounts.constants.collectionName, id));
  } catch (error) {
    console.error("Failed to delete account:", error);
  }
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
    } = state.accounts.formData;
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

    if (id) {
      await setDoc(
        doc(db, state.accounts.constants.collectionName, id),
        accountData,
        { merge: true }
      );
    } else {
      const newDocRef = doc(
        collection(db, state.accounts.constants.collectionName)
      );
      await setDoc(newDocRef, accountData);
    }
    closeAccountDialog();
  } catch (error) {
    console.error("Failed to save account:", error);
  }
};

watch(
  () => filteredAccts.value,
  (newValue) => {
    console.log("filteredAccts updated in Accounts.vue:", newValue);
  },
  { immediate: true }
);

watch(
  () => route.query.id,
  (newValue) => {
    console.log("route.query.id updated in Accounts.vue:", newValue);
    state.accounts.formData.categoryId = newValue || "";
  },
  { immediate: true }
);
</script>

<style scoped>
.wrap-card-title {
  white-space: normal !important;
  flex: 1 1 auto !important;
}
.account-stats {
  margin-bottom: 16px;
  font-size: 1.1rem;
}
.no-accounts {
  margin-bottom: 16px;
  font-size: 1rem;
  color: #666;
}
.h-100 {
  height: 100%;
}
.account-card {
  min-height: 100px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}
</style>
