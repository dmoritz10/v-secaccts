<template>
  <v-container fluid class="h-100 ma-0 pa-0 responsive-container">
    <template v-if="accountStore.isLoaded && currentAccountIsLoaded">
      <v-row
        class="position-sticky top-0 mx-0 px-0 mb-2 pb-2 grey lighten-4"
        style="z-index: 20"
      >
        <v-col cols="12" class="pb-0 px-0">
          <v-sheet
            class="mx-3 px-4 pt-3 pb-3 mt-1 mb-0 border"
            elevation="0"
            rounded
          >
            <v-row class="align-center">
              <v-col cols="1">
                <v-icon
                  size="32"
                  color="black"
                  style="cursor: pointer"
                  @click="returnToAccounts"
                >
                  mdi-chevron-left
                </v-icon>
              </v-col>
              <v-col class="text-center">
                <h2 class="subtitle-1 grey--text text-center">
                  {{ currentAccount?.provider }}
                </h2>
              </v-col>
              <!-- Sandwich / 3-dot menu -->
              <v-col cols="1" class="d-flex justify-end">
                <!-- <v-menu location="bottom-end">
                  <template #activator="{ props }">
                    <v-btn icon v-bind="props" variant="text">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>

                  <v-list>
                    <v-list-item
                      @click="
                        alertTest(
                          'Alert Title',
                          '<strong>Hi dan<br><br>more text'
                        )
                      "
                    >
                      <v-list-item-title>alert</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="confirmTest">
                      <v-list-item-title>confirm</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="toastTest('title', 'message')">
                      <v-list-item-title>toast</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu> -->
              </v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>
      <v-card class="account-details grey lighten-4">
        <v-card-text class="tight-card-text">
          <v-table density="compact" class="compressed-table">
            <tbody>
              <!-- <tr>
                <td class="text-green-darken-3 font-weight-bold">Provider</td>
                <td><h3>{{ currentAccount?.provider || "N/A" }}</h3></td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.provider || 'N/A',
                        'Provider'
                      )
                    "
                  ></v-icon>
                </td>
              </tr> -->
              <tr>
                <td class="text-green-darken-3 font-weight-bold">Category</td>
                <td>
                  <h3>
                    {{
                      categoryStore.categoryNameFor(currentAccount?.categoryId)
                    }}
                  </h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        categoryNameFor(currentAccount?.categoryId) || 'N/A',
                        'Category'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr>
                <td class="text-green-darken-3 font-weight-bold">Login</td>
                <td>
                  <h3>{{ currentAccount?.login }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(currentAccount?.login || 'N/A', 'Login')
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr>
                <td class="text-green-darken-3 font-weight-bold">Password</td>
                <td>
                  <h3>
                    {{ currentAccount?.password }}
                  </h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        showPassword
                          ? currentAccount?.password || 'N/A'
                          : '****',
                        'Password'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.accountNbr">
                <td class="text-green-darken-3 font-weight-bold">
                  Account Number
                </td>
                <td>
                  <h3>{{ currentAccount?.accountNbr }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.accountNbr,
                        'Account Number'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr>
                <td class="text-green-darken-3 font-weight-bold">Encrypted</td>
                <td>
                  <h3>{{ currentAccount?.enc ? "Yes" : "No" }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.enc ? 'Yes' : 'No',
                        'Encrypted'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.favorite">
                <td class="text-green-darken-3 font-weight-bold">Favorite</td>
                <td>
                  <h3>{{ currentAccount?.favorite ? "Yes" : "No" }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.favorite ? 'Yes' : 'No',
                        'Favorite'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.loginUrl">
                <td class="text-green-darken-3 font-weight-bold">Login URL</td>
                <td>
                  <a
                    :href="currentAccount?.loginUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{
                      currentAccount?.loginUrl &&
                      currentAccount?.loginUrl.length > 30
                        ? currentAccount?.loginUrl.slice(0, 30) + "..."
                        : currentAccount?.loginUrl
                    }}</a
                  >
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.loginUrl &&
                          currentAccount?.loginUrl.length > 30
                          ? currentAccount?.loginUrl.slice(0, 30) + '...'
                          : currentAccount?.loginUrl || 'N/A',
                        'Login URL'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.autoPay">
                <td class="text-green-darken-3 font-weight-bold">Auto Pay</td>
                <td>
                  <h3>{{ currentAccount?.autoPay }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(currentAccount?.autoPay, 'Auto Pay')
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.pinNbr">
                <td class="text-green-darken-3 font-weight-bold">PIN Number</td>
                <td>
                  <h3>{{ currentAccount?.pinNbr }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(currentAccount?.pinNbr, 'PIN Number')
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.securityQA">
                <td class="text-green-darken-3 font-weight-bold">
                  Security Q&A
                </td>
                <td>
                  <h3>{{ currentAccount?.securityQA }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(
                        currentAccount?.securityQA,
                        'Security Q&A'
                      )
                    "
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.notes">
                <td class="text-green-darken-3 font-weight-bold">Notes</td>
                <td>
                  <h3>{{ currentAccount?.notes }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="copyToClipboard(currentAccount?.notes, 'Notes')"
                  ></v-icon>
                </td>
              </tr>
              <tr v-if="currentAccount?.lastChange">
                <td class="text-green-darken-3 font-weight-bold">
                  Last Change
                </td>
                <td>
                  <h3>{{ currentAccount?.lastChange }}</h3>
                </td>
                <td class="icon-cell">
                  <v-icon
                    size="small"
                    icon="mdi-content-copy"
                    @click="
                      copyToClipboard(currentAccount?.lastChange, 'Last Change')
                    "
                  ></v-icon>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
      <v-footer app class="justify-center pa-3 grey lighten-4">
        <v-btn-group
          class="rounded-2xl shadow-md bg-blue p-1"
          variant="tonal"
          color="primary"
          density="compact"
        >
          <v-btn
            :disabled="!previousAccount"
            color="white"
            @click="navigateToAccount(previousAccount?.id)"
            >Prev</v-btn
          >
          <v-btn color="white" @click="openUpdateDialog(currentAccount)">
            <!-- <v-btn color="primary" @click="openAccountDialog(currentAccount)" -->
            Update</v-btn
          >
          <v-btn
            :disabled="!nextAccount"
            color="white"
            @click="navigateToAccount(nextAccount?.id)"
            >Next</v-btn
          >
        </v-btn-group>
      </v-footer>

      <!-- Update Dialog -->
      <!-- Account Dialog -->
      <AccountDialog
        v-model="accountStore.dialog"
        :form-data="accountStore.state.formData"
        @save="($event) => handleSave($event)"
        @cancel="accountStore.closeAccountDialog"
      />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, watch, nextTick, ref, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import AccountDialog from "@/components/AccountDialog.vue";

import {
  encryptAccts,
  decryptAccts,
  acctDBFlds,
  decryptAcctReactive,
} from "@/services/common";
import { pinia } from "@/services/pinia";
import { useAuthStore } from "@/stores/auth";
import { until } from "@vueuse/core";
import {
  toast,
  alertDialog,
  confirmDialog,
  blockScreen,
  unblockScreen,
} from "@/ui/dialogState.js";

const authStore = useAuthStore(pinia);

const route = useRoute();
const router = useRouter();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();

const showPassword = ref(false); // Toggle for password visibility

const currentAccountIsLoaded = ref(false);

// Compute the index reactively
const idx = computed(() =>
  accountStore.state.items.findIndex(
    (acct) => acct.id === route.params.accountId
  )
);
// One-way reactive computed ref
const currentAccount = computed(() => {
  const acct = accountStore.state.items[idx.value];
  return acct ? { ...acct } : null; // shallow clone breaks reference
});

watch(currentAccount, async () => {
  console.log("watch", currentAccount.value.enc, { ...currentAccount.value });
  currentAccountIsLoaded.value = false;
  // console.trace("Change stack trace:");
  if (currentAccount.value.enc) {
    await decryptAcctReactive(currentAccount.value, authStore.currUser.pwd);
    // Mark as decrypted
    currentAccount.value.enc = false;
  }
  currentAccountIsLoaded.value = true;
  console.log("watch decrypt", { ...currentAccount.value });
});

const filteredAccounts = computed(() => accountStore.filteredAccounts);

const currentIndex = computed(() => {
  const accountId = route.params.accountId;
  return filteredAccounts.value.findIndex((acct) => acct.id === accountId);
});

const previousAccount = computed(() => {
  const index = currentIndex.value;
  return index > 0 ? filteredAccounts.value[index - 1] : null;
});

const nextAccount = computed(() => {
  const index = currentIndex.value;
  return index < filteredAccounts.value.length - 1
    ? filteredAccounts.value[index + 1]
    : null;
});

const copyToClipboard = async (text, fieldName) => {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard", 3000);
  } catch (error) {
    console.error("ShowAccount.vue: Failed to copy to clipboard:", error);
    alertDialog("ShowAccount.vue: Failed to copy to clipboard", error);
  }
};

onMounted(async () => {
  console.log("ShowAccount onMounted", { ...currentAccount.value });

  // Wait until currentAccount is defined
  await until(() => accountStore.state.items.length > 0);

  // If encrypted, decrypt in place
  if (currentAccount.value.enc) {
    await decryptAcctReactive(currentAccount.value, authStore.currUser.pwd);
    // Mark as decrypted
    currentAccount.value.enc = false;
  }
  console.log("ShowAccount onMounted after", { ...currentAccount.value });

  // Now data is ready for template
  currentAccountIsLoaded.value = true;
  console.log("onMount complete");
});

const returnToAccounts = () => {
  console.log("returnToAccounts", currentAccount.value, {
    id: currentAccount.value.categoryId,
    name: categoryStore.categoryNameFor(currentAccount.value.categoryId),
    scrollTo: currentAccount.value.id,
    ts: Date.now(),
  });
  router.push({
    path: "/accounts",
    query: {
      id: currentAccount.value.categoryId,
      name: categoryStore.categoryNameFor(currentAccount.value.categoryId),
      scrollTo: currentAccount.value.id,
      ts: Date.now(),
    },
  });
};

const navigateToAccount = (accountId) => {
  if (!accountId) return;
  console.log("ShowAccount.vue navigateToAccount, accountId:", accountId);
  router.push({ path: `/account/${accountId}`, query: route.query });
};

const openUpdateDialog = (account) => {
  console.log("openUpdateDialog", account, account.provider);
  accountStore.openAccountDialog(account);
};

const handleSave = async (formData) => {
  try {
    await accountStore.saveAccount(formData);
    await nextTick();
    accountStore.closeAccountDialog();
    router.push({
      path: "/accounts",
      query: {
        id: formData.categoryId,
        name: categoryStore.categoryNameFor(formData.categoryId),
        scrollTo: formData.accountId,
        ts: Date.now(),
      },
    });
  } catch (error) {
    console.error("ShowAccount.vue save account failed:", error);
    alertDialog("ShowAccount.vue save account failed", error);
  }
};
</script>

<style scoped>
.responsive-container {
  width: 100%;
  max-width: 100% !important; /* Force container to fit viewport */
  margin: 0;
  padding: 0;
}
.account-details {
  width: 100%;
  max-width: 100% !important; /* Force card to fit viewport */
  margin: 0;
  padding: 10px;
  box-shadow: none; /* Optional: Remove default card shadow */
}
.tight-card-text {
  padding: 4px !important; /* Reduce padding to maximize table space */
}
.icon-cell {
  padding: 4px !important;
}

.compressed-table :deep(tr) {
  height: 36px;
}
.compressed-table :deep(td) {
  padding: 4px 8px;
  font-size: 0.875rem;
}
.compressed-table {
  width: 100%;
  max-width: 100% !important; /* Force table to fit viewport */
  table-layout: fixed;
}
.compressed-table :deep(td:first-child) {
  width: 128px !important; /* Fixed width for label column */
  padding-right: 0px;
}
.compressed-table :deep(td:nth-child(2)) {
  width: 100%; /* Take remaining space */
  word-break: break-all; /* Aggressively wrap long content */
  max-width: calc(100% - 168px); /* 120px (first) + 48px (third) */
}
.compressed-table :deep(.icon-cell) {
  width: 48px; /* Fixed width for copy icon */
  text-align: center;
}
</style>
