import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { db } from '@/firebase';
import { collection, query, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { alertDialog } from '@/ui/dialogState.js';
import { encryptMessage, decryptMessage } from '@/services/enc';
import { encryptAccts, docEncFlds } from '@/services/common';

import { watch } from 'vue';

export const useDocumentStore = defineStore('document', () => {
  const state = reactive({
    items: [],
    isLoaded: false,
    formData: {
      notes: null,
      pinNbr: null,
      docNbr: null,
      name: null,
      provider: '',
      docCategoryId: null,
      favorite: false,
      enc: false,
      expiry: null,
    },
    searchQuery: '',
  });

  const dialog = ref(false);
  const unsubscribeDocuments = ref(null);
  let isInitialLoad = true;

  const _selectedDocCatId = ref('');
  const selectedDocCatId = computed({
    get: () => _selectedDocCatId.value,
    set: (newId) => {
      _selectedDocCatId.value = newId;
    },
  });

  const selectedAllDocs = ref(false);
  const activeFilters = ref(['']);

  const isLoaded = computed(() => state.isLoaded);

  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      state.searchQuery = value;
    },
  });

  // Modify filteredDocuments to consider selected filters
  const filteredDocuments = computed(() => {
    const filters = activeFilters.value;
    const catId = selectedAllDocs.value ? '' : selectedDocCatId.value;
    // const catId = selectedDocCatId;
    const query = state.searchQuery ? state.searchQuery.toLowerCase().trim() : '';
    let filtered = state.items || [];

    if (!state.isLoaded) return [];

    // Filter by docCategoryId
    if (catId) {
      filtered = filtered.filter((account) => (account.docCategoryId || '') === catId);
    } else {
      // console.log('Showing all documents');
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter((account) => account.provider?.toLowerCase().includes(query));
      filtered = filtered.filter((account) => account.name?.toLowerCase().includes(query));
    }

    // Filter by activeFilters
    if (filters.includes('favorite')) {
      filtered = filtered.filter((acct) => acct.favorite);
    }

    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });

  // Action to set filters
  const setFilters = (filters) => {
    activeFilters.value = [...filters]; // force array replacement
  };

  const subscribeToDocuments = async () => {
    if (unsubscribeDocuments.value) {
      console.log('Documents subscription already exists, skipping');
      return;
    }
    if (state.isLoaded) {
      console.log('Documents already loaded, skipping subscription');
      return;
    }
    try {
      console.log('Loading initial documents...');
      const q = query(collection(db, 'documents'));
      const snapshot = await getDocs(q);
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      state.isLoaded = true;

      console.log('Subscribing to documents for real-time updates...');
      unsubscribeDocuments.value = onSnapshot(q, (snapshot) => {
        if (isInitialLoad) {
          console.log('Skipping initial onSnapshot processing');
          isInitialLoad = false;
          return;
        }
        console.log('Processing real-time account updates...');
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
            // console.log("shapshot", "remove", removeId);
          } else if (index === -1) {
            state.items.push(data);
            // console.log("shapshot", "add", index, data);
          } else {
            state.items[index] = data;
            // console.log("shapshot", "update", index, data);
          }
        });
        state.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        console.log('Documents updated via subscription:', updates.length);
      });
    } catch (error) {
      console.error('Error subscribing to documents:', error);
      alertDialog('Error subscribing to documents', error);
      state.isLoaded = false;
      throw error;
    }
  };

  const unsubscribeFromDocuments = () => {
    if (unsubscribeDocuments.value) {
      console.log('Unsubscribing from documents...');
      unsubscribeDocuments.value();
      unsubscribeDocuments.value = null;
      state.isLoaded = false;
      state.items = [];
      isInitialLoad = true;
    }
  };

  const saveDocument = async (formData) => {
    try {
      formData.lastChange = new Date().toDateString();

      const { documentId, ...accountFields } = formData;

      const acct = buildEncryptedData(accountFields);

      const dbFields = (await encryptAccts([acct]))[0];

      let docRef;
      if (documentId) {
        // It's an existing document, overwrite it cleanly using setDoc
        docRef = doc(db, 'documents', documentId);
        await setDoc(docRef, dbFields);
      } else {
        // It's a brand new document
        dbFields.dateAdd = new Date().toDateString();
        docRef = await addDoc(collection(db, 'documents'), dbFields);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error saving account:', error);
      alertDialog('Error saving account', error);
      throw error;
    }
  };

  const buildEncryptedData = (acct) => {
    const sensitivePayload = {};
    const plaintextRoot = {};

    // 1. Sort fields into either the encrypted payload or the plaintext root
    Object.keys(acct).forEach((key) => {
      if (docEncFlds.includes(key)) {
        if (acct[key] !== null && acct[key] !== undefined) {
          sensitivePayload[key] = acct[key];
        }
      } else {
        plaintextRoot[key] = acct[key];
      }
    });

    return { ...plaintextRoot, encryptedData: JSON.stringify(sensitivePayload) };
  };

  const deleteDocument = async (documentId) => {
    try {
      await deleteDoc(doc(db, 'documents', documentId));
      console.log('Document deleted:', documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      alertDialog('Error deleting document', error);
    }
  };

  const FAVORITE_STATES = [null, 'blue-darken-1', 'green-darken-3', 'yellow-darken-4'];

  async function cycleFavorite(documentId, currentValue) {
    // normalize old boolean values into the new state set
    const current =
      currentValue === true ? 'blue' : currentValue === false || currentValue == null ? null : currentValue;

    const idx = FAVORITE_STATES.indexOf(current);
    const next = FAVORITE_STATES[(idx + 1) % FAVORITE_STATES.length];
    const dateStamp = new Date().toDateString();
    const accountRef = doc(db, 'documents', documentId);
    await updateDoc(accountRef, {
      favorite: next,
      lastChange: dateStamp,
    });
  }

  // A clean factory function for a fresh, blank account
  const createBlankDocument = (docCategoryId = null) => ({
    notes: null,
    pinNbr: null,
    docNbr: null,
    name: null,
    provider: '',
    docCategoryId: docCategoryId,
    favorite: false,
    enc: false,
    expiry: null,
    lastChange: null,
  });

  const openDocumentDialog = async (account) => {
    console.log('openDocumentDialog account', account);
    dialog.value = true;

    const acct = JSON.parse(JSON.stringify(account));

    if (acct?.id) {
      // 1. Clone the record and normalize the ID key for your form state
      const { id, encryptedData, ...plaintextRoot } = acct;
      const encData = encryptedData ? encryptedData : '{}';
      const acctFormState = { ...plaintextRoot, documentId: id };

      // 2. Decrypt the unified JSON string block if it exists
      if (encData) {
        try {
          const decryptedJsonString = acct.enc && encData ? await decryptMessage(encData) : encData;
          const decryptedPayload = JSON.parse(decryptedJsonString);

          console.log('decryptedPayload', acct.enc, encData, decryptedJsonString, decryptedPayload);
          acct.enc = false;

          // Dynamically merge all decrypted fields directly into your form state
          Object.assign(acctFormState, decryptedPayload);
        } catch (e) {
          console.error('Failed to decrypt unified acct payload:', e);
        }
      }
      console.log('acctFormState', acctFormState);
      // Set enc to false so fields display and edit as clear text in the UI inputs
      acctFormState.enc = false;
      state.formData = acctFormState;
    } else {
      // 3. Initialize a clean state model for a brand new acct
      state.formData = createBlankDocument(acct?.docCategoryId);
    }
  };

  const closeDocumentDialog = () => {
    dialog.value = false;
  };

  return {
    state,
    isLoaded,
    dialog,
    searchQuery,
    filteredDocuments,
    subscribeToDocuments,
    unsubscribeFromDocuments,
    saveDocument,
    deleteDocument,
    openDocumentDialog,
    closeDocumentDialog,
    cycleFavorite,
    setFilters,
    buildEncryptedData,
    activeFilters,
    selectedDocCatId,
    selectedAllDocs,
  };
});
