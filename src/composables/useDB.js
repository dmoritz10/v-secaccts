import { reactive, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

export function useDB() {
  const router = useRouter();
  const route = useRoute();

  // Reactive state for both collections
  const state = reactive({
    categories: {
      items: [], // Array of categories
      constants: {
        collectionName: "categories",
      },
      searchQuery: "", // Search query for categories
      selectedCardId: null, // Selected category card
      dialog: false, // Dialog state for add/edit category
      formData: { id: null, name: "" }, // Form data for add/edit category
    },
    accounts: {
      items: [], // Array of accounts
      constants: {
        collectionName: "accounts",
      },
      searchQuery: route.query.search || "", // Initialize from route query
      selectedCardId: null, // Selected account card
      dialog: false, // Dialog state for add/edit account
      formData: { id: null, name: "", provider: "", categoryId: "" }, // Form data for add/edit account
    },
  });

  // Computed properties for categories
  const filteredCats = computed(() => {
    if (!state.categories.searchQuery) return state.categories.items;
    const query = state.categories.searchQuery.toLowerCase();
    return state.categories.items.filter((cat) => {
      const catMatch = cat.name.toLowerCase().includes(query);
      const acctMatch = state.accounts.items.some(
        (acct) =>
          acct.categoryId === cat.id &&
          acct.provider.toLowerCase().includes(query)
      );
      return catMatch || acctMatch;
    });
  });

  const nbrCats = computed(() => filteredCats.value.length);

  const nbrAccts = computed(() => {
    const categoryIds = filteredCats.value.map((cat) => cat.id);
    return state.accounts.items.filter((acct) =>
      categoryIds.includes(acct.categoryId)
    ).length;
  });

  // Computed properties for accounts
  const filteredAccts = computed(() => {
    const query = state.accounts.searchQuery.toLowerCase();
    const categoryId = route.params.categoryId;
    let accounts = state.accounts.items;
    if (categoryId) {
      accounts = accounts.filter((acct) => acct.categoryId === categoryId);
    }
    if (!query) return accounts;

    return accounts.filter((acct) =>
      // state.categories.items.name.toLowerCase().includes(query) ||
      acct.provider.toLowerCase().includes(query)
    );
  });

  const nbrFilteredAccts = computed(() => filteredAccts.value.length);

  // Real-time listeners
  let unsubscribeCats = null;
  let unsubscribeAccts = null;
  onMounted(() => {
    unsubscribeCats = onSnapshot(
      collection(db, state.categories.constants.collectionName),
      (querySnapshot) => {
        state.categories.items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      },
      (error) => {
        console.error("Error in categories onSnapshot:", error);
      }
    );
    unsubscribeAccts = onSnapshot(
      collection(db, state.accounts.constants.collectionName),
      (querySnapshot) => {
        state.accounts.items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      },
      (error) => {
        console.error("Error in accounts onSnapshot:", error);
      }
    );
  });

  onUnmounted(() => {
    if (unsubscribeCats) unsubscribeCats();
    if (unsubscribeAccts) unsubscribeAccts();
  });

  // Dialog management
  const openCategoryDialog = (cat = null) => {
    state.categories.formData = cat
      ? { id: cat.id, name: cat.name }
      : { id: null, name: "" };
    state.categories.dialog = true;
  };

  const openAccountDialog = (acct = null, categoryId = null) => {
    console.log("openAccount", acct, categoryId);
    state.accounts.formData = acct
      ? {
          id: acct.id,
          name: acct.name,
          provider: acct.provider,
          categoryId: acct.categoryId,
        }
      : {
          id: null,
          name: "",
          provider: "",
          categoryId: categoryId || route.params.categoryId || "",
        };
    state.accounts.dialog = true;
  };

  const closeCategoryDialog = () => {
    state.categories.dialog = false;
    state.categories.formData = { id: null, name: "" };
  };

  const closeAccountDialog = () => {
    state.accounts.dialog = false;
    state.accounts.formData = {
      id: null,
      name: "",
      provider: "",
      categoryId: "",
    };
  };

  // Navigation
  const goToAccounts = (categoryId, categoryName) => {
    state.categories.selectedCardId = categoryId;
    router.push({
      path: `/accounts/${categoryId}/${categoryName}`,
      query: { search: state.categories.searchQuery },
    });
  };

  // CRUD operations
  const deleteCategory = async (id) => {
    try {
      await deleteDoc(doc(db, state.categories.constants.collectionName, id));
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const deleteAccount = async (id) => {
    try {
      await deleteDoc(doc(db, state.accounts.constants.collectionName, id));
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  const saveCategory = async () => {
    try {
      const { id, name } = state.categories.formData;
      if (id) {
        // Edit existing category
        await setDoc(
          doc(db, state.categories.constants.collectionName, id),
          { name },
          { merge: true }
        );
      } else {
        // Add new category
        const newDocRef = doc(
          collection(db, state.categories.constants.collectionName)
        );
        await setDoc(newDocRef, { name, enc: false });
      }
      closeCategoryDialog();
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const saveAccount = async () => {
    try {
      const { id, name, provider, categoryId } = state.accounts.formData;
      if (id) {
        // Edit existing account
        await setDoc(
          doc(db, state.accounts.constants.collectionName, id),
          { provider },
          { merge: true }
        );
      } else {
        // Add new account
        const newDocRef = doc(
          collection(db, state.accounts.constants.collectionName)
        );
        await setDoc(newDocRef, { name, provider, categoryId });
      }
      closeAccountDialog();
    } catch (error) {
      console.error("Failed to save account:", error);
    }
  };

  // Card selection
  const selectCategoryCard = (id) => {
    state.categories.selectedCardId = id;
  };

  const selectAccountCard = (id) => {
    state.accounts.selectedCardId = id;
  };

  return {
    state,
    filteredCats,
    nbrCats,
    filteredAccts,
    nbrFilteredAccts,
    nbrAccts,
    goToAccounts,
    openCategoryDialog,
    openAccountDialog,
    closeCategoryDialog,
    closeAccountDialog,
    deleteCategory,
    deleteAccount,
    saveCategory,
    saveAccount,
    selectCategoryCard,
    selectAccountCard,
  };
}
