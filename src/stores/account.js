import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { db } from "@/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import {
  toast,
  alertDialog,
  confirmDialog,
  blockScreen,
  unblockScreen,
} from "@/ui/dialogState.js";
import { encryptMessage, decryptMessage } from "@/services/enc";
import { encryptAccts, decryptAccts, acctDBFlds } from "@/services/common";
import { pinia } from "@/services/pinia";

import { useCategoryStore } from "@/stores/category";
import { useAuthStore } from "@/stores/auth";

import { watch, nextTick } from "vue";

export const useAccountStore = defineStore("account", () => {
  const authStore = useAuthStore();
  const categoryStore = useCategoryStore();

  const state = reactive({
    items: [],
    isLoaded: false,
    formData: {
      accountId: null,
      provider: "",
      accountNbr: null,
      autoPay: false,
      categoryId: null,
      login: null,
      loginUrl: null,
      notes: null,
      password: null,
      pinNbr: null,
      securityQA: null,
      favorite: false,
      enc: false,
    },
    searchQuery: "",
  });

  const dialog = ref(false);
  const unsubscribeAccounts = ref(null);
  let isInitialLoad = true;

  const _selectedCatId = ref("");
  const selectedCatId = computed({
    get: () => _selectedCatId.value,
    set: (newId) => {
      _selectedCatId.value = newId;
    },
  });

  const activeFilters = ref([""]);

  const isLoaded = computed(() => state.isLoaded);

  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      console.log("Updating searchQuery:", value);
      state.searchQuery = value;
    },
  });

  watch(state.formData.enc, (newVal, oldVal) => {
    console.log(
      "%c[accountStore.formData.enc]",
      "color: red; font-weight: bold;",
      { oldVal, newVal, typeofOld: typeof oldVal, typeofNew: typeof newVal }
    );
    console.trace("Change stack trace:");
  });

  const numberOfFilteredAccounts = computed(
    () => filteredAccounts?.value.length || 0
  );

  // Modify filteredAccounts to consider selected filters
  const filteredAccounts = computed(() => {
    const filters = activeFilters.value;
    const catId = selectedCatId.value;
    console.log("catId", catId, selectedCatId);
    // const catId = selectedCatId;
    const query = state.searchQuery
      ? state.searchQuery.toLowerCase().trim()
      : "";
    let filtered = state.items || [];

    if (!state.isLoaded) return [];

    // Filter by categoryId
    if (catId) {
      console.log("filter by categoryId", catId);
      filtered = filtered.filter(
        (account) => (account.categoryId || "") === catId
      );
    } else {
      console.log("Showing all accounts");
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter((account) =>
        account.provider?.toLowerCase().includes(query)
      );
    }

    // Filter by activeFilters
    if (filters.includes("favorite")) {
      filtered = filtered.filter((acct) => acct.favorite);
      console.log("fav", filtered);
    }
    if (filters.includes("autoPay")) {
      filtered = filtered.filter((acct) => acct.autoPay != null);
      console.log("autopay", filtered);
    }

    return filtered.sort((a, b) =>
      (a.provider || "").localeCompare(b.provider || "")
    );
  });

  // Action to set filters
  const setFilters = (filters) => {
    activeFilters.value = [...filters]; // force array replacement
  };

  const subscribeToAccounts = async () => {
    if (unsubscribeAccounts.value) {
      console.log("Accounts subscription already exists, skipping");
      return;
    }
    if (state.isLoaded) {
      console.log("Accounts already loaded, skipping subscription");
      return;
    }
    try {
      console.log("Loading initial accounts...");
      const q = query(collection(db, "accounts"));
      const snapshot = await getDocs(q);
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.items.sort((a, b) =>
        (a.provider || "").localeCompare(b.provider || "")
      );
      state.isLoaded = true;
      console.log(
        "Initial accounts loaded:",
        state.items.length,
        "items:",
        state.items
      );

      console.log("Subscribing to accounts for real-time updates...");
      unsubscribeAccounts.value = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          console.log("Skipping initial onSnapshot processing");
          isInitialLoad = false;
          return;
        }
        console.log("Processing real-time account updates...");
        const updates = [];
        snapshot.docChanges().forEach((change) => {
          const data = { id: change.doc.id, ...change.doc.data() };
          if (change.type === "added" || change.type === "modified") {
            updates.push({
              index: state.items.findIndex((item) => item.id === change.doc.id),
              data,
            });
          } else if (change.type === "removed") {
            updates.push({ removeId: change.doc.id });
          }
        });

        console.log("snapshot", updates);

        updates.forEach(({ index, data, removeId }) => {
          if (removeId) {
            state.items = state.items.filter((item) => item.id !== removeId);
            console.log("shapshot", "remove", removeId);
          } else if (index === -1) {
            state.items.push(data);
            console.log("shapshot", "add", index, data);
          } else {
            state.items[index] = data;
            console.log("shapshot", "update", index, data);
          }
        });
        state.items.sort((a, b) =>
          (a.provider || "").localeCompare(b.provider || "")
        );
        console.log("Accounts updated via subscription:", state.items.length);
      });
    } catch (error) {
      console.error("Error subscribing to accounts:", error);
      alertDialog("Error subscribing to accounts", error);
      state.isLoaded = false;
      throw error;
    }
  };

  const unsubscribeFromAccounts = () => {
    if (unsubscribeAccounts.value) {
      console.log("Unsubscribing from accounts...");
      unsubscribeAccounts.value();
      unsubscribeAccounts.value = null;
      state.isLoaded = false;
      state.items = [];
      isInitialLoad = true;
    }
  };

  const saveAccount = async (formData) => {
    console.log("saveaccount", formData);
    try {
      const cat = categoryStore.state.items.find(
        (cat) => cat.id === formData.categoryId
      );

      formData.lastChange = new Date().toDateString();
      if (!formData.enc && cat.enc) {
        var encAccts = (
          await encryptAccts([formData], authStore.currUser.pwd)
        )[0];
        encAccts.enc = true;
      } else {
        var encAccts = formData;
        encAccts.enc = false;
      }

      const dbFields = selectDBFields(encAccts);

      let docRef;
      if (formData.accountId) {
        console.log("update", formData.accountId, dbFields);
        docRef = doc(db, "accounts", formData.accountId);
        await updateDoc(docRef, dbFields);
      } else {
        console.log("add", formData.accountId);
        docRef = await addDoc(collection(db, "accounts"), dbFields);
      }
      return docRef.id;
    } catch (error) {
      console.error("Error saving account:", error);
      alertDialog("Error saving account", error);
      throw error;
    }
  };

  const selectDBFields = (obj) => {
    const newObject = {};
    for (const key of acctDBFlds) {
      if (obj.hasOwnProperty(key)) {
        newObject[key] = obj[key];
      }
    }
    return newObject;
  };

  const deleteAccount = async (accountId) => {
    try {
      console.log("Deleting account:", accountId);
      await deleteDoc(doc(db, "accounts", accountId));
      console.log("Account deleted:", accountId);
    } catch (error) {
      console.error("Error deleting account:", error);
      alertDialog("Error deleting account", error);
    }
  };

  async function toggleFavorite(accountId, currentValue, enc) {
    console.log("toggleFavorite enc", enc);
    const dateStamp = enc
      ? await encryptMessage(new Date().toDateString(), authStore.currUser.pwd)
      : new Date().toDateString();
    const accountRef = doc(db, "accounts", accountId);
    await updateDoc(accountRef, {
      favorite: !currentValue,
      lastChange: dateStamp,
    });
  }

  const openAccountDialog = async (account, pwd) => {
    console.log("openAccountDialog account", account, pwd);
    dialog.value = true;
    state.formData = account.id
      ? {
          accountId: account.id,
          provider: account.provider,
          accountNbr: account.enc
            ? await decryptMessage(account.accountNbr, pwd)
            : account.accountNbr,
          autoPay: account.enc
            ? await decryptMessage(account.autoPay, pwd)
            : account.autoPay,
          categoryId: account.categoryId,
          enc: account.enc,
          login: account.enc
            ? await decryptMessage(account.login, pwd)
            : account.login,
          loginUrl: account.enc
            ? await decryptMessage(account.loginUrl, pwd)
            : account.loginUrl,
          notes: account.enc
            ? await decryptMessage(account.notes, pwd)
            : account.notes,
          password: account.enc
            ? await decryptMessage(account.password, pwd)
            : account.password,
          pinNbr: account.enc
            ? await decryptMessage(account.pinNbr, pwd)
            : account.pinNbr,
          securityQA: account.enc
            ? await decryptMessage(account.securityQA, pwd)
            : account.securityQA,
          favorite: account.favorite,
          lastChange: account.enc
            ? await decryptMessage(account.lastChange, pwd)
            : account.lastChange,
        }
      : {
          accountId: null,
          provider: "",
          accountNbr: null,
          autoPay: null,
          categoryId: account.categoryId,
          enc: false,
          login: null,
          loginUrl: null,
          notes: null,
          password: null,
          pinNbr: null,
          securityQA: null,
          favorite: false,
          lastChange: null,
        };
    console.log("Opening account dialog:", state.formData);
  };

  const closeAccountDialog = () => {
    dialog.value = false;
    console.log("Account dialog closed");
  };

  return {
    state,
    isLoaded,
    dialog,
    searchQuery,
    filteredAccounts,
    numberOfFilteredAccounts,
    subscribeToAccounts,
    unsubscribeFromAccounts,
    saveAccount,
    deleteAccount,
    openAccountDialog,
    closeAccountDialog,
    toggleFavorite,
    setFilters,
    activeFilters,
    selectedCatId,
  };
});
