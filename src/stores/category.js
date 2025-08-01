import { defineStore } from "pinia";
import { computed, reactive } from "vue";
import { db } from "@/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useAccountStore } from "./account";

export const useCategoryStore = defineStore("category", () => {
  const accountStore = useAccountStore();

  const state = reactive({
    items: [],
    isLoaded: false,
    dialog: false,
    formData: {
      categoryId: null,
      name: "",
      enc: false,
    },
    searchQuery: "",
  });

  const isLoaded = computed(() => state.isLoaded);
  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      console.log("Updating searchQuery:", value);
      state.searchQuery = value;
    },
  });
  const numberOfFilteredCategories = computed(
    () => filteredCategories.value.length
  );

  const filteredCategories = computed(() => {
    console.log(
      "Computing filteredCategories, accountStore.isLoaded:",
      accountStore.isLoaded,
      "accountStore.items:",
      accountStore.items.length,
      "searchQuery:",
      state.searchQuery
    );
    const query = state.searchQuery
      ? state.searchQuery.toLowerCase().trim()
      : "";
    if (!query) {
      console.log(
        "Empty search query, returning all categories:",
        state.items.length
      );
      return state.items
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const filtered = state.items
      .filter((cat) => {
        const hasMatchingAccount = accountStore.items.some((account) => {
          const matches =
            account.categoryId === cat.id &&
            account.provider?.toLowerCase().includes(query);
          console.log(
            `Account ${account.id} (provider: ${account.provider}, categoryId: ${account.categoryId}) matches query "${query}":`,
            matches
          );
          return matches;
        });
        console.log(
          `Category ${cat.id} (${cat.name}): hasMatchingAccount=`,
          hasMatchingAccount
        );
        return hasMatchingAccount;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    console.log("Filtered categories:", filtered.length);
    return filtered;
  });

  const fetchCategories = async () => {
    try {
      console.log("Fetching categories...");
      const q = query(collection(db, "categories"));
      const snapshot = await new Promise((resolve) => {
        onSnapshot(q, (snap) => resolve(snap));
      });
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.isLoaded = true;
      console.log("Categories fetched:", state.items);
    } catch (error) {
      console.error("Error fetching categories:", error);
      state.isLoaded = false;
      throw error;
    }
  };

  const subscribeToCategories = async () => {
    try {
      console.log("Subscribing to categories...");
      const q = query(collection(db, "categories"));
      onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const index = state.items.findIndex(
              (item) => item.id === change.doc.id
            );
            const data = { id: change.doc.id, ...change.doc.data() };
            if (index === -1) {
              state.items.push(data);
            } else {
              state.items[index] = data;
            }
          } else if (change.type === "removed") {
            state.items = state.items.filter(
              (item) => item.id !== change.doc.id
            );
          }
        });
        state.items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        console.log("Categories updated via subscription:", state.items);
      });
    } catch (error) {
      console.error("Error subscribing to categories:", error);
    }
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
      state.formData = { categoryId: null, name: "", enc: false };
      return docRef.id;
    } catch (error) {
      console.error("Error saving category:", error);
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
      throw error;
    }
  };

  const openCategoryDialog = (category = null) => {
    state.dialog = true;
    state.formData = category
      ? { categoryId: category.id, name: category.name, enc: category.enc }
      : { categoryId: null, name: "", enc: false };
    console.log("Opening category dialog:", state.formData);
  };

  const closeCategoryDialog = () => {
    state.dialog = false;
    state.formData = { categoryId: null, name: "", enc: false };
    console.log("Category dialog closed");
  };

  return {
    state,
    isLoaded,
    dialog: computed({
      get: () => state.dialog,
      set: (value) => {
        state.dialog = value;
      },
    }),
    searchQuery,
    filteredCategories,
    numberOfFilteredCategories,
    fetchCategories,
    subscribeToCategories,
    saveCategory,
    deleteCategory,
    openCategoryDialog,
    closeCategoryDialog,
  };
});
