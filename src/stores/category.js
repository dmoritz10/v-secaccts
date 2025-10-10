import { defineStore } from "pinia";
import { computed, reactive, ref, nextTick } from "vue";
import { db } from "@/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useAccountStore } from "./account";
import { useAuthStore } from "./auth";
// import { encyptCat, decyptCat } from "@/services/common";

import { toast, alertDialog, confirmDialog, blockScreen, unblockScreen } from "@/ui/dialogState.js";

export const useCategoryStore = defineStore("category", () => {
  const accountStore = useAccountStore();
  const authStore = useAuthStore();

  const state = reactive({
    items: [],
    isLoaded: false,
    formData: {
      categoryId: null,
      name: "",
      enc: false,
    },
    searchQuery: "",
  });

  const dialog = ref(false);
  const unsubscribeCategories = ref(null);
  let isInitialLoad = true;

  const isLoaded = computed(() => state.isLoaded);
  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      console.log("Updating searchQuery:", value);
      state.searchQuery = value;
    },
  });
  const numberOfFilteredCategories = computed(() => filteredCategories.value?.length || 0);

  const filteredCategories = computed(() => {
    const query = state.searchQuery ? state.searchQuery.toLowerCase().trim() : "";
    if (!query || !accountStore.isLoaded || !Array.isArray(accountStore.state.items)) {
      console.log("Empty query or accounts not loaded, returning all categories:", state.items.length);
      return state.items.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const filtered = state.items.filter((cat) => {
      const hasMatchingAccount = accountStore.state.items.some((account) => {
        const matches = account.categoryId === cat.id && account.provider?.toLowerCase().includes(query);
        return matches;
      });
      console.log(`Category ${cat.id} (${cat.name}): hasMatchingAccount=`, hasMatchingAccount);
      return hasMatchingAccount;
    });

    console.log("Filtered categories:", filtered.length);
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  const subscribeToCategories = async () => {
    if (unsubscribeCategories.value) {
      console.log("Categories subscription already exists, skipping");
      return;
    }
    if (state.isLoaded) {
      console.log("Categories already loaded, skipping subscription");
      return;
    }
    try {
      console.log("Loading initial categories...");
      const q = query(collection(db, "categories"));
      const snapshot = await getDocs(q);
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      state.isLoaded = true;
      console.log("Initial categories loaded:", state.items.length);

      console.log("Subscribing to categories for real-time updates...");
      unsubscribeCategories.value = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          console.log("Skipping initial onSnapshot processing");
          isInitialLoad = false;
          return;
        }
        console.log("Processing real-time category updates...");
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
        updates.forEach(({ index, data, removeId }) => {
          if (removeId) {
            state.items = state.items.filter((item) => item.id !== removeId);
          } else if (index === -1) {
            state.items.push(data);
          } else {
            state.items[index] = data;
          }
        });
        state.items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        console.log("Categories updated via subscription:", state.items.length);
      });
    } catch (error) {
      console.error("Error subscribing to categories:", error);
      state.isLoaded = false;
      throw error;
    }
  };

  const unsubscribeFromCategories = () => {
    if (unsubscribeCategories.value) {
      console.log("Unsubscribing from categories...");
      unsubscribeCategories.value();
      unsubscribeCategories.value = null;
      state.isLoaded = false;
      state.items = [];
      isInitialLoad = true;
    }
  };

  const categoryNameFor = (categoryId) => {
    console.log("categoryNameFor", categoryId);
    const category = state.items.find((cat) => cat.id === categoryId);
    console.log("categoryNameFor", categoryId, category, state.items);
    return category ? category.name : "N/A";
  };

  const saveCategory = async () => {
    try {
      console.log("Saving category:", { ...state.formData });
      const { categoryId, name, enc } = state.formData;
      if (!name) throw new Error("Category name is required");

      let docRef;
      if (categoryId) {
        docRef = doc(db, "categories", categoryId);
        await updateDoc(docRef, { name, enc });
        console.log("Category updated:", categoryId);
      } else {
        docRef = await addDoc(collection(db, "categories"), { name, enc });
        console.log("Category added:", docRef.id);
      }
      await nextTick();
      closeCategoryDialog();
      state.formData = { categoryId: null, name: "", enc: false };
      return docRef.id;
    } catch (error) {
      console.error("Error saving category:", error);
      alertDialog("Error saving category", error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      console.log("Deleting category:", categoryId);
      await deleteDoc(doc(db, "categories", categoryId));
      console.log("Category deleted:", categoryId);
    } catch (error) {
      console.error("Error deleting category:", error);
      alertDialog("Error deleting category", error);
    }
  };

  const openCategoryDialog = (category = null) => {
    dialog.value = true;
    state.formData = category
      ? { categoryId: category.id, name: category.name, enc: category.enc }
      : { categoryId: null, name: "", enc: false };
    console.log("Opening category dialog:", state.formData);
  };

  const closeCategoryDialog = () => {
    dialog.value = false;
    state.formData = { categoryId: null, name: "", enc: false };
    console.log("Category dialog closed");
  };

  return {
    state,
    isLoaded,
    dialog,
    searchQuery,
    filteredCategories,
    numberOfFilteredCategories,
    subscribeToCategories,
    unsubscribeFromCategories,
    saveCategory,
    deleteCategory,
    openCategoryDialog,
    closeCategoryDialog,
    categoryNameFor,
  };
});
