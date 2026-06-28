import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { db, storage } from '@/firebase';
import { ref as storageRef, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { collection, query, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { alertDialog } from '@/ui/dialogState.js';
import { encryptBlob, decryptBlob, encryptMessage, decryptMessage } from '@/services/enc';
import { encryptAccts, docEncFlds } from '@/services/common';
import { renderPdfThumbnail } from '@/services/pdfThumbnail';

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

      const {
        documentId,
        frontFile,
        backFile,
        removeFront,
        removeBack,
        frontPreviewUrl,
        backPreviewUrl,
        ...accountFields
      } = formData;
      const isNew = !documentId;
      const docId = documentId || doc(collection(db, 'documents')).id; // pre-generate if new

      const acct = buildEncryptedData(accountFields);
      const dbFields = (await encryptAccts([acct]))[0];

      // Handle Front file
      if (frontFile) {
        const { path, type } = await uploadDocumentFile(docId, 'front', frontFile);
        dbFields.frontPath = path;
        dbFields.frontType = type;
      } else if (removeFront) {
        await deleteDocumentFile(formData.frontPath);
        dbFields.frontPath = null;
        dbFields.frontType = null;
      } else {
        dbFields.frontPath = formData.frontPath ?? null;
        dbFields.frontType = formData.frontType ?? null;
      }

      // Handle Back file
      if (backFile) {
        const { path, type } = await uploadDocumentFile(docId, 'back', backFile);
        dbFields.backPath = path;
        dbFields.backType = type;
      } else if (removeBack) {
        await deleteDocumentFile(formData.backPath);
        dbFields.backPath = null;
        dbFields.backType = null;
      } else {
        dbFields.backPath = formData.backPath ?? null;
        dbFields.backType = formData.backType ?? null;
      }

      const docRef = doc(db, 'documents', docId);
      if (isNew) {
        dbFields.dateAdd = new Date().toDateString();
      }
      await setDoc(docRef, dbFields);

      return docId;
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

  const deleteDocument = async (documentId, docData = null) => {
    try {
      const docSnap = docData || state.items.find((d) => d.id === documentId);
      if (docSnap) {
        await deleteDocumentFile(docSnap.frontPath);
        await deleteDocumentFile(docSnap.backPath);
      }
      await deleteDoc(doc(db, 'documents', documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alertDialog('Error deleting document', error);
    }
  };

  async function uploadDocumentFile(documentId, side, file) {
    // side: 'front' | 'back'
    const encryptedBlob = await encryptBlob(file);
    const path = `documents/${documentId}/${side}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, encryptedBlob);
    return { path, type: file.type };
  }

  async function downloadDocumentFile(path, mimeType) {
    const fileRef = storageRef(storage, path);
    const arrayBuffer = await getBytes(fileRef);
    const encryptedBlob = new Blob([arrayBuffer]);
    return decryptBlob(encryptedBlob, mimeType);
  }

  async function deleteDocumentFile(path) {
    if (!path) return;
    const fileRef = storageRef(storage, path);
    try {
      await deleteObject(fileRef);
    } catch (e) {
      if (e.code !== 'storage/object-not-found') throw e; // already gone is fine
    }
  }

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
    expiry: null,
    lastChange: null,
    frontPath: null,
    frontType: null,
    backPath: null,
    backType: null,
    frontPreviewUrl: null,
    backPreviewUrl: null,
  });

  const openDocumentDialog = async (account) => {
    console.log('openDocumentDialog account', account);
    dialog.value = true;

    const acct = JSON.parse(JSON.stringify(account));

    if (acct?.id) {
      const { id, encryptedData, ...plaintextRoot } = acct;
      const acctFormState = { ...plaintextRoot, documentId: id };

      if (encryptedData) {
        try {
          const decryptedJsonString = await decryptMessage(encryptedData);
          const decryptedPayload = JSON.parse(decryptedJsonString);
          Object.assign(acctFormState, decryptedPayload);
        } catch (e) {
          console.error('Failed to decrypt unified acct payload:', e);
        }
      }

      acctFormState.frontPreviewUrl = null;
      acctFormState.backPreviewUrl = null;

      if (acctFormState.frontPath) {
        try {
          const blob = await downloadDocumentFile(acctFormState.frontPath, acctFormState.frontType);
          acctFormState.frontPreviewUrl =
            acctFormState.frontType === 'application/pdf' ? await renderPdfThumbnail(blob) : URL.createObjectURL(blob);
        } catch (e) {
          console.error('Failed to fetch/decrypt front file:', e);
        }
      }

      if (acctFormState.backPath) {
        try {
          const blob = await downloadDocumentFile(acctFormState.backPath, acctFormState.backType);
          acctFormState.backPreviewUrl =
            acctFormState.backType === 'application/pdf' ? await renderPdfThumbnail(blob) : URL.createObjectURL(blob);
        } catch (e) {
          console.error('Failed to fetch/decrypt back file:', e);
        }
      }

      state.formData = acctFormState;
    } else {
      state.formData = createBlankDocument(acct?.docCategoryId);
    }
  };

  const closeDocumentDialog = () => {
    if (state.formData?.frontPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.formData.frontPreviewUrl);
    }
    if (state.formData?.backPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.formData.backPreviewUrl);
    }
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
    downloadDocumentFile,
    activeFilters,
    selectedDocCatId,
    selectedAllDocs,
  };
});
