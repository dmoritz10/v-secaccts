import { defineStore } from "pinia";
import { computed, reactive, ref, nextTick } from "vue";
import { db } from "@/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, getDocs, where, writeBatch } from "firebase/firestore";
import { useAccountStore } from "./account";
import { toast, alertDialog, confirmDialog } from "@/ui/dialogState.js";

export const useCategoryStore = defineStore("category", () => {
  const accountStore = useAccountStore();

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
    const category = state.items.find((cat) => cat.id === categoryId);
    return category ? category.name : "N/A";
  };

  const saveCategory = async () => {
    try {
      const { categoryId, name, enc } = state.formData;
      if (!name) throw new Error("Category name is required");

      let docRef;
      if (categoryId) {
        docRef = doc(db, "categories", categoryId);
        await updateDoc(docRef, { name, enc });
      } else {
        docRef = await addDoc(collection(db, "categories"), { name, enc });
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
    var catName = categoryNameFor(categoryId);
    const accountsRef = collection(db, "accounts");
    const q = query(accountsRef, where("categoryId", "==", categoryId));
    const accts = await getDocs(q);
    console.log("accts", accts);
    if (accts.docs.length) {
      var msg = `This category is linked to ${accts.docs.length} accounts. Deleting it will also delete these accounts.  <br><br>Continue with deletion ?`;
      var confirmOK = await confirmDialog(`Delete Category ${catName}`, msg);
      if (!confirmOK) return;
    }

    const batch = writeBatch(db);

    try {
      console.log(`Deleting all accounts for categoryId: ${categoryId}...`);

      // Add each account doc to batch delete
      accts.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Delete the category document itself
      const categoryRef = doc(db, "categories", categoryId);
      batch.delete(categoryRef);

      // Commit all deletions
      await batch.commit();

      toast(`Category ${catName} deleted`);
      console.log(`✅ Deleted category ${catName} and ${accts.size} accounts`);
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
  };

  const closeCategoryDialog = () => {
    dialog.value = false;
    state.formData = { categoryId: null, name: "", enc: false };
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
