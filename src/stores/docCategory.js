import { defineStore } from 'pinia';
import { computed, reactive, ref, nextTick } from 'vue';
import { db } from '@/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { useDocumentStore } from './document';
import { toast, alertDialog, confirmDialog } from '@/ui/dialogState.js';

const BLANK_DOCCATEGORY = { name: '', enc: false };

export const useDocCategoryStore = defineStore('docCategory', () => {
  const documentStore = useDocumentStore();

  const state = reactive({
    items: [],
    isLoaded: false,
    selectedDocCategory: null, // The object currently being edited
    searchQuery: '',
    isSearchActive: false,
  });

  const dialog = ref(false);

  const toggleSearch = () => {
    if (state.isSearchActive) {
      // When closing, clear the search so the full list returns
      state.searchQuery = '';
    }
    state.isSearchActive = !state.isSearchActive;
  };

  const unsubscribeDocCategories = ref(null);
  let isInitialLoad = true;
  const isLoaded = computed(() => state.isLoaded);
  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      state.searchQuery = value;
    },
  });

  const filteredDocCategories = computed(() => {
    const query = state.searchQuery ? state.searchQuery.toLowerCase().trim() : '';
    if (!query || !documentStore.isLoaded || !Array.isArray(documentStore.state.items)) {
      console.log('Empty query or accounts not loaded, returning all docCategories:', state.items.length);
      return state.items.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const filtered = state.items.filter((cat) => {
      const hasMatchingAccount = documentStore.state.items.some((account) => {
        const matches = account.docCategoryId === cat.id && account.name?.toLowerCase().includes(query);
        return matches;
      });
      return hasMatchingAccount;
    });

    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });

  const subscribeToDocCategories = async () => {
    if (unsubscribeDocCategories.value) {
      console.log('docCategories subscription already exists, skipping');
      return;
    }
    if (state.isLoaded) {
      console.log('docCategories already loaded, skipping subscription');
      return;
    }
    try {
      console.log('Loading initial docCategories...');
      const q = query(collection(db, 'docCategories'));
      const snapshot = await getDocs(q);
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      state.isLoaded = true;
      console.log('Initial docCategories loaded:', state.items.length);

      console.log('Subscribing to docCategories for real-time updates...');
      unsubscribeDocCategories.value = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          console.log('Skipping initial onSnapshot processing');
          isInitialLoad = false;
          return;
        }
        console.log('Processing real-time docCategories updates...');
        const updates = [];
        snapshot.docChanges().forEach((change) => {
          const data = { id: change.doc.id, ...change.doc.data() };
          if (change.type === 'added' || change.type === 'modified') {
            updates.push({
              index: state.items.findIndex((item) => item.id === change.doc.id),
              data,
            });
          } else if (change.type === 'removed') {
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
        state.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        console.log('docCategories updated via subscription:', state.items.length);
      });
    } catch (error) {
      console.error('Error subscribing to docCategories:', error);
      state.isLoaded = false;
      throw error;
    }
  };

  const unsubscribeFromDocCategories = () => {
    if (unsubscribeDocCategories.value) {
      console.log('Unsubscribing from docCategories...');
      unsubscribeDocCategories.value();
      unsubscribeDocCategories.value = null;
      state.isLoaded = false;
      state.items = [];
      isInitialLoad = true;
    }
  };

  const docCategoryNameFor = (docCategoryId) => {
    const category = state.items.find((cat) => cat.id === docCategoryId);
    return category ? category.name : 'N/A';
  };

  const getCatEnc = (docCategoryId) => {
    const category = state.items.find((cat) => cat.id === docCategoryId);
    return category ? category.enc : false;
  };

  const openDocCategoryDialog = (category = null) => {
    state.selectedDocCategory = category ? category : { ...BLANK_DOCCATEGORY };
    dialog.value = true;
  };

  const closeDocCategoryDialog = () => {
    dialog.value = false;
    state.selectedDocCategory = null;
  };

  // 3. Receive the cleaned data from the dialog
  const saveDocCategory = async (categoryData) => {
    console.log('saveDocCat', saveDocCategory);
    const { id, name, enc } = categoryData;
    if (!name) return;

    if (id) {
      await updateDoc(doc(db, 'docCategories', id), { name, enc });
    } else {
      await addDoc(collection(db, 'docCategories'), { name, enc });
    }
    closeDocCategoryDialog();
  };

  const deleteDocCategory = async (docCategoryId) => {
    var catName = categoryNameFor(docCategoryId);
    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, where('docCategoryId', '==', docCategoryId));
    const accts = await getDocs(q);
    if (accts.docs.length) {
      var msg = `This category is linked to ${accts.docs.length} accounts. Deleting it will also delete those accounts.  <br><br>Continue with deletion ?`;
      var confirmOK = await confirmDialog(`Delete Category ${catName}`, msg);
      if (!confirmOK) return;
    }

    const batch = writeBatch(db);

    try {
      console.log(`Deleting all accounts for docCategoryId: ${docCategoryId}...`);

      // Add each account doc to batch delete
      accts.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Delete the category document itself
      const categoryRef = doc(db, 'docCategories', docCategoryId);
      batch.delete(categoryRef);

      // Commit all deletions
      await batch.commit();

      toast(`Category ${catName} deleted`);
      console.log(`✅ Deleted category ${catName} and ${accts.size} accounts`);
    } catch (error) {
      console.error('Error deleting category:', error);
      alertDialog('Error deleting category', error);
    }
  };

  return {
    state,
    isLoaded,
    dialog,
    searchQuery,
    filteredDocCategories,
    toggleSearch,
    subscribeToDocCategories,
    unsubscribeFromDocCategories,
    saveDocCategory,
    deleteDocCategory,
    openDocCategoryDialog,
    closeDocCategoryDialog,
    docCategoryNameFor,
    getCatEnc,
  };
});
