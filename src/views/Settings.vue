<template>
  <v-container fluid class="h-100 ma-0 pa-0">
    <v-container fluid class="ma-0 pa-0 d-flex flex-column h-100" style="overflow: visible">
      <!-- FIXED: Changed from v-row to a standard div block to stop vertical expansion -->
      <div class="position-sticky top-0 mx-0 px-0 mb-5" style="z-index: 20; background-color: #f9f9f9">
        <div class="w-100 pb-0 px-0">
          <v-sheet
            class="mx-3 px-4 pt-6 pb-3 mt-1 mb-0 border position-relative"
            style="overflow: visible"
            elevation="0"
            rounded>
            <v-row class="align-center">
              <v-col class="text-center">
                <h1 class="subtitle-1 grey--text text-center">Settings</h1>
              </v-col>
            </v-row>
          </v-sheet>
        </div>
      </div>

      <!-- BUTTON CONTAINER: Now sits tightly right beneath the header -->
      <div class="d-flex flex-column ga-3 mx-3 pa-3" style="background-color: #f9f9f9">
        <div>
          <v-btn color="primary" variant="outlined" class="pa-2" @click.stop="openChangePasswordDialog">
            Change password
          </v-btn>
        </div>
      </div>

      <div class="d-flex flex-column ga-3 mx-3 pa-3" style="background-color: #f9f9f9">
        <div>
          <v-btn color="primary" variant="outlined" class="pa-2" @click.stop="handleSignOut">Sign out</v-btn>
        </div>
      </div>

      <!-- VERSION BLOCK: Pins to the bottom -->
      <div class="pa-4 text-center text-grey-darken-1 mt-auto">
        <div class="text-caption font-weight-medium">The Account Companion</div>
        <div class="text-caption">
          Version: {{ VERSION }}
          <br />
          {{ BUILD_DATE }}
        </div>
      </div>
    </v-container>

    <PasswordChangeDialog ref="pwdDialog" />
  </v-container>
</template>
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import CategoryDialog from '@/components/CategoryDialog.vue';
import PasswordChangeDialog from '@/components/PasswordChangeDialog.vue';
import { alertDialog } from '@/ui/dialogState.js';
import { clearKey } from '@/services/keyVault';
import { marked } from 'marked';
import { getStorage } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { VERSION, BUILD_DATE } from '@/services/version-info.js';
import { db } from '@/firebase';
import {
  collection,
  doc,
  query,
  getDocs,
  getDoc,
  where,
  updateDoc,
  addDoc,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { encryptBlob, decryptBlob } from '../services/enc.js';

const menuOpen = ref(false);
const router = useRouter();
const route = useRoute();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const authStore = useAuthStore();
const pwdDialog = ref(null);

function openChangePasswordDialog() {
  pwdDialog.value.open();
}
// quick manual test, paste into a component or run in browser console
async function testBlobRoundtrip() {
  const original = new Blob(['hello world test content'], { type: 'text/plain' });

  const encrypted = await encryptBlob(original);
  console.log('Encrypted size:', encrypted.size, 'Original size:', original.size);

  const decrypted = await decryptBlob(encrypted, 'text/plain');
  const text = await decrypted.text();
  console.log('Round-tripped text:', text); // should be: hello world test content
}
async function checkEncryptedDataField() {
  const collections = ['accounts', 'documents'];
  const problems = {};

  for (const colName of collections) {
    const snapshot = await getDocs(collection(db, colName));
    const allDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const bad = allDocs.filter((d) => {
      const v = d.encryptedData;
      return v === undefined || v === null || v === '';
    });

    problems[colName] = bad.map((d) => d.id);
  }

  console.log('Records with missing/empty encryptedData:', problems);
  return problems;
}

async function checkForUnencrypted() {
  const collections = ['accounts', 'documents'];
  const results = {};

  for (const colName of collections) {
    const q = query(collection(db, colName), where('enc', '==', false));
    const snapshot = await getDocs(q);
    results[colName] = snapshot.docs.map((d) => d.id);
  }

  console.log('Unencrypted documents found:', results);
  return results;
}

const handleSignOut = async () => {
  try {
    await signOut(auth);
    authStore.clearUser();
    clearKey();
    router.replace('/');
  } catch (error) {
    authStore.clearUser();
    clearKey();
    router.replace('/');
  }
};

const about = async () => {
  const res = await fetch('/about.md');
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching about.md`);
  const markdown = await res.text();
  let html = marked.parse(markdown);
  html = html.replace('VERSION', VERSION).replace('DATE', BUILD_DATE);
  alertDialog('About Secure Accounts', html);
};
</script>
