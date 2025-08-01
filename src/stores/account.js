import { defineStore } from "pinia";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { ref, computed } from "vue";

export const useAccountStore = defineStore("account", () => {
  const items = ref([]);
  const isLoaded = ref(false);
  const dialog = ref(false);
  const formData = ref({
    id: null,
    provider: "",
    accountNbr: "",
    autoPay: false,
    categoryId: "",
    login: "",
    loginUrl: "",
    notes: "",
    password: "",
    pinNbr: "",
    securityQA: "",
    favorite: false,
    enc: false,
  });
  const searchQuery = ref("");

  const filteredAccounts = computed(() => (categoryId) => {
    if (!items.value) return [];
    const query = searchQuery.value?.toLowerCase() || "";
    return items.value
      .filter(
        (acct) =>
          acct.categoryId === categoryId &&
          acct.provider?.toLowerCase().includes(query)
      )
      .sort((a, b) => a.provider.localeCompare(b.provider));
  });

  const numberOfFilteredAccounts = computed(() => (categoryId) => {
    return filteredAccounts.value(categoryId).length;
  });

  async function fetchAccounts() {
    try {
      console.log("Fetching accounts...");
      const querySnapshot = await getDocs(collection(db, "accounts"));
      items.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      isLoaded.value = true;
      console.log("Accounts fetched:", items.value);
    } catch (error) {
      console.error("fetchAccounts failed:", error);
      isLoaded.value = true;
      items.value = [];
    }
  }

  function subscribeToAccounts() {
    try {
      console.log("Subscribing to accounts...");
      onSnapshot(
        collection(db, "accounts"),
        (snapshot) => {
          items.value = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          isLoaded.value = true;
          console.log("Accounts updated via subscription:", items.value);
        },
        (error) => {
          console.error("subscribeToAccounts failed:", error);
          isLoaded.value = true;
          items.value = [];
        }
      );
    } catch (error) {
      console.error("subscribeToAccounts setup failed:", error);
      isLoaded.value = true;
      items.value = [];
    }
  }

  async function saveAccount() {
    try {
      console.log("Saving account:", formData.value);
      if (formData.value.id) {
        const accountRef = doc(db, "accounts", formData.value.id);
        await updateDoc(accountRef, {
          provider: formData.value.provider,
          accountNbr: formData.value.accountNbr,
          autoPay: formData.value.autoPay,
          categoryId: formData.value.categoryId,
          login: formData.value.login,
          loginUrl: formData.value.loginUrl,
          notes: formData.value.notes,
          password: formData.value.password,
          pinNbr: formData.value.pinNbr,
          securityQA: formData.value.securityQA,
          favorite: formData.value.favorite,
          enc: formData.value.enc,
          lastChange: new Date().toISOString(),
        });
        console.log("Account updated:", formData.value.id);
        return formData.value.id;
      } else {
        const docRef = await addDoc(collection(db, "accounts"), {
          provider: formData.value.provider,
          accountNbr: formData.value.accountNbr,
          autoPay: formData.value.autoPay,
          categoryId: formData.value.categoryId,
          login: formData.value.login,
          loginUrl: formData.value.loginUrl,
          notes: formData.value.notes,
          password: formData.value.password,
          pinNbr: formData.value.pinNbr,
          securityQA: formData.value.securityQA,
          favorite: formData.value.favorite,
          enc: formData.value.enc,
          lastChange: new Date().toISOString(),
        });
        console.log("Account added:", docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error("saveAccount failed:", error);
      throw error;
    }
  }

  function openAccountDialog(account = null, categoryId) {
    formData.value = account
      ? { ...account }
      : {
          id: null,
          provider: "",
          accountNbr: "",
          autoPay: false,
          categoryId: categoryId || "",
          login: "",
          loginUrl: "",
          notes: "",
          password: "",
          pinNbr: "",
          securityQA: "",
          favorite: false,
          enc: false,
        };
    dialog.value = true;
    console.log("Account dialog opened:", formData.value);
  }

  function closeAccountDialog() {
    dialog.value = false;
    formData.value = {
      id: null,
      provider: "",
      accountNbr: "",
      autoPay: false,
      categoryId: "",
      login: "",
      loginUrl: "",
      notes: "",
      password: "",
      pinNbr: "",
      securityQA: "",
      favorite: false,
      enc: false,
    };
    console.log("Account dialog closed");
  }

  async function deleteAccount(id) {
    try {
      console.log("Deleting account:", id);
      await deleteDoc(doc(db, "accounts", id));
      console.log("Account deleted:", id);
    } catch (error) {
      console.error("deleteAccount failed:", error);
    }
  }

  return {
    items,
    isLoaded,
    dialog,
    formData,
    searchQuery,
    filteredAccounts,
    numberOfFilteredAccounts,
    fetchAccounts,
    subscribeToAccounts,
    saveAccount,
    openAccountDialog,
    closeAccountDialog,
    deleteAccount,
  };
});
