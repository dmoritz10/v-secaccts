import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { db } from '@/firebase';
import { collection, query, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { alertDialog, confirmDialog } from '@/ui/dialogState.js';
import { decryptMessage } from '@/services/enc';
import { encryptAccts, acctEncFlds } from '@/services/common';

import { watch } from 'vue';

export const useAccountStore = defineStore('account', () => {
  const state = reactive({
    items: [],
    isLoaded: false,
    formData: {
      accountId: null,
      provider: '',
      owner: '',
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
      filtered = filtered.filter((account) => (account.categoryId || '') === catId);
    } else {
      // console.log('Showing all accounts');
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
        console.log('Accounts updated via subscription:', updates.length);
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

      const dbFields = (await encryptAccts([acct]))[0];

      let docRef;
      if (accountId) {
        // It's an existing document, overwrite it cleanly using setDoc
        docRef = doc(db, 'accounts', accountId);
        await setDoc(docRef, dbFields);
      } else {
        // It's a brand new document
        dbFields.dateAdd = new Date().toDateString();
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
        }
      } else {
        plaintextRoot[key] = acct[key];
      }
    });

    return { ...plaintextRoot, encryptedData: JSON.stringify(sensitivePayload) };
  };

  const deleteAccount = async (accountId) => {
    var msg = `This account is will be permanently removed. There is no undo.  <br><br>Continue with deletion ?`;
    var confirmOK = await confirmDialog(`Delete Account`, msg);
    if (!confirmOK) return;

    try {
      await deleteDoc(doc(db, 'accounts', accountId));
      console.log('Account deleted:', accountId);
    } catch (error) {
      console.error('Error deleting account:', error);
      alertDialog('Error deleting account', error);
    }
  };

  const FAVORITE_STATES = [null, 'blue-darken-1', 'green-darken-3', 'yellow-darken-4'];

  async function cycleFavorite(accountId, currentValue) {
    // normalize old boolean values into the new state set
    const current =
      currentValue === true ? 'blue' : currentValue === false || currentValue == null ? null : currentValue;

    const idx = FAVORITE_STATES.indexOf(current);
    const next = FAVORITE_STATES[(idx + 1) % FAVORITE_STATES.length];
    const dateStamp = new Date().toDateString();
    const accountRef = doc(db, 'accounts', accountId);
    await updateDoc(accountRef, {
      favorite: next,
      lastChange: dateStamp,
    });
  }

  // A clean factory function for a fresh, blank account
  const createBlankAccount = (categoryId = null) => ({
    accountId: null,
    provider: '',
    owner: '',
    accountNbr: null,
    autoPay: null,
    categoryId: categoryId,
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
    console.log('openAccountDialog account');
    dialog.value = true;

    const acct = JSON.parse(JSON.stringify(account));

    if (acct?.id) {
      const { id, encryptedData, ...plaintextRoot } = acct;
      const acctFormState = { ...plaintextRoot, accountId: id };

      if (encryptedData) {
        // Coming from Document.vue (list view) — still encrypted, decrypt now
        try {
          const decryptedJsonString = await decryptMessage(encryptedData);
          const decryptedPayload = JSON.parse(decryptedJsonString);
          Object.assign(acctFormState, decryptedPayload);
        } catch (e) {
          console.error('Failed to decrypt unified acct payload:', e);
        }
      }
      // else: already decrypted reactively (coming from ShowDocument.vue) —
      // plaintextRoot already has the real fields merged in, nothing to do

      state.formData = acctFormState;
    } else {
      state.formData = createBlankAccount(acct?.categoryId);
    }
  };

  const closeAccountDialog = () => {
    state.formData = {};
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
    cycleFavorite,
    setFilters,
    buildEncryptedData,
    activeFilters,
    selectedCatId,
    selectedAllAccts,
  };
});
