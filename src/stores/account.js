import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { db } from '@/firebase';
import { collection, query, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { alertDialog } from '@/ui/dialogState.js';
import { encryptMessage, decryptMessage } from '@/services/enc';
import { encryptAccts, acctEncFlds } from '@/services/common';

import { useCategoryStore } from '@/stores/category';

import { watch } from 'vue';

export const useAccountStore = defineStore('account', () => {
  const categoryStore = useCategoryStore();

  const state = reactive({
    items: [],
    isLoaded: false,
    formData: {
      accountId: null,
      provider: '',
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
    searchQuery: '',
  });

  const dialog = ref(false);
  const unsubscribeAccounts = ref(null);
  let isInitialLoad = true;

  const _selectedCatId = ref('');
  const selectedCatId = computed({
    get: () => _selectedCatId.value,
    set: (newId) => {
      _selectedCatId.value = newId;
    },
  });

  const selectedAllAccts = ref(false);
  const activeFilters = ref(['']);

  const isLoaded = computed(() => state.isLoaded);

  const searchQuery = computed({
    get: () => state.searchQuery,
    set: (value) => {
      state.searchQuery = value;
    },
  });

  watch(state.formData.enc, (newVal, oldVal) => {
    console.log('%c[accountStore.formData.enc]', 'color: red; font-weight: bold;', {
      oldVal,
      newVal,
      typeofOld: typeof oldVal,
      typeofNew: typeof newVal,
    });
    console.trace('Change stack trace:');
  });

  const numberOfFilteredAccounts = computed(() => filteredAccounts?.value.length || 0);

  // Modify filteredAccounts to consider selected filters
  const filteredAccounts = computed(() => {
    const filters = activeFilters.value;
    const catId = selectedAllAccts.value ? '' : selectedCatId.value;
    // const catId = selectedCatId;
    const query = state.searchQuery ? state.searchQuery.toLowerCase().trim() : '';
    let filtered = state.items || [];

    if (!state.isLoaded) return [];

    // Filter by categoryId
    if (catId) {
      console.log('filter by categoryId', catId);
      filtered = filtered.filter((account) => (account.categoryId || '') === catId);
    } else {
      console.log('Showing all accounts');
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter((account) => account.provider?.toLowerCase().includes(query));
    }

    // Filter by activeFilters
    if (filters.includes('favorite')) {
      filtered = filtered.filter((acct) => acct.favorite);
    }
    if (filters.includes('autoPay')) {
      filtered = filtered.filter((acct) => acct.autoPay != null);
    }

    return filtered.sort((a, b) => (a.provider || '').localeCompare(b.provider || ''));
  });

  // Action to set filters
  const setFilters = (filters) => {
    activeFilters.value = [...filters]; // force array replacement
  };

  const subscribeToAccounts = async () => {
    if (unsubscribeAccounts.value) {
      console.log('Accounts subscription already exists, skipping');
      return;
    }
    if (state.isLoaded) {
      console.log('Accounts already loaded, skipping subscription');
      return;
    }
    try {
      console.log('Loading initial accounts...');
      const q = query(collection(db, 'accounts'));
      const snapshot = await getDocs(q);
      state.items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      state.items.sort((a, b) => (a.provider || '').localeCompare(b.provider || ''));
      state.isLoaded = true;

      console.log('Subscribing to accounts for real-time updates...');
      unsubscribeAccounts.value = onSnapshot(q, (snapshot) => {
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
        state.items.sort((a, b) => (a.provider || '').localeCompare(b.provider || ''));
        console.log('Accounts updated via subscription:', state.items.length);
      });
    } catch (error) {
      console.error('Error subscribing to accounts:', error);
      alertDialog('Error subscribing to accounts', error);
      state.isLoaded = false;
      throw error;
    }
  };

  const unsubscribeFromAccounts = () => {
    if (unsubscribeAccounts.value) {
      console.log('Unsubscribing from accounts...');
      unsubscribeAccounts.value();
      unsubscribeAccounts.value = null;
      state.isLoaded = false;
      state.items = [];
      isInitialLoad = true;
    }
  };

  const saveAccount = async (formData) => {
    try {
      formData.lastChange = new Date().toDateString();

      const { accountId, ...accountFields } = formData;

      const acct = buildEncryptedData(accountFields);
      console.log('buildEncryptedData', accountFields, acct);

      const dbFields = (await encryptAccts([acct]))[0];

      let docRef;
      if (accountId) {
        // It's an existing document, overwrite it cleanly using setDoc
        docRef = doc(db, 'accounts', accountId);
        await setDoc(docRef, dbFields);
      } else {
        // It's a brand new document
        docRef = await addDoc(collection(db, 'accounts'), dbFields);
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
      if (acctEncFlds.includes(key)) {
        if (acct[key] !== null && acct[key] !== undefined) {
          sensitivePayload[key] = acct[key];
          console.log('sens', acct[key], sensitivePayload);
        }
      } else {
        plaintextRoot[key] = acct[key];
      }
    });

    return { ...plaintextRoot, encryptedData: JSON.stringify(sensitivePayload) };
  };

  const deleteAccount = async (accountId) => {
    try {
      await deleteDoc(doc(db, 'accounts', accountId));
      console.log('Account deleted:', accountId);
    } catch (error) {
      console.error('Error deleting account:', error);
      alertDialog('Error deleting account', error);
    }
  };

  async function toggleFavorite(accountId, currentValue) {
    const dateStamp = new Date().toDateString();
    const accountRef = doc(db, 'accounts', accountId);
    await updateDoc(accountRef, {
      favorite: !currentValue,
      lastChange: dateStamp,
    });
  }

  // A clean factory function for a fresh, blank account
  const createBlankAccount = (categoryId = null) => ({
    accountId: null,
    provider: '',
    accountNbr: null,
    autoPay: null,
    categoryId: categoryId,
    enc: false,
    login: null,
    loginUrl: null,
    notes: null,
    password: null,
    pinNbr: null,
    securityQA: null,
    favorite: false,
    lastChange: null,
  });

  const openAccountDialog = async (account) => {
    console.log('openAccountDialog account', account);
    dialog.value = true;

    const acct = JSON.parse(JSON.stringify(account));

    if (acct?.id) {
      // 1. Clone the record and normalize the ID key for your form state
      const { id, encryptedData, ...plaintextRoot } = acct;
      const encData = encryptedData ? encryptedData : null;
      console.log('plain', JSON.parse(JSON.stringify(plaintextRoot)));
      console.log('encryptedData', JSON.parse(JSON.stringify(encData)));
      const acctFormState = { ...plaintextRoot, accountId: id };

      console.log(
        'acct',
        id,
        encData,
        JSON.parse(JSON.stringify(plaintextRoot)),
        JSON.parse(JSON.stringify(acctFormState))
      );

      // 2. Decrypt the unified JSON string block if it exists
      if (encData) {
        try {
          const decryptedJsonString = acct.enc && encData ? await decryptMessage(encData) : '{}';
          console.log('dc', decryptedJsonString);
          const decryptedPayload = JSON.parse(decryptedJsonString);
          console.log('dpl', decryptedPayload);
          acct.enc = false;

          console.log('decryptedPayload', decryptedPayload, acctFormState);

          // Dynamically merge all decrypted fields directly into your form state
          Object.assign(acctFormState, decryptedPayload);
        } catch (e) {
          console.error('Failed to decrypt unified acct payload:', e);
        }
      }

      // Set enc to false so fields display and edit as clear text in the UI inputs
      acctFormState.enc = false;
      state.formData = acctFormState;
    } else {
      // 3. Initialize a clean state model for a brand new acct
      state.formData = createBlankAccount(acct?.categoryId);
    }

    console.log('Opening account dialog:', state.formData);
  };

  const closeAccountDialog = () => {
    dialog.value = false;
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
    buildEncryptedData,
    activeFilters,
    selectedCatId,
  };
});
