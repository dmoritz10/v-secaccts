import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase';
import Categories from '@/views/Categories.vue';
import DocCategories from '@/views/DocCategories.vue';
import NoteCategories from '@/views/NoteCategories.vue';
import Accounts from '@/views/Accounts.vue';
import Documents from '@/views/Documents.vue';
import ShowAccount from '@/views/ShowAccount.vue';
import ShowDocument from '@/views/ShowDocument.vue';
import Login from '@/views/Login.vue';
import { useAuthStore } from '@/stores/auth';
import { getKey } from '@/services/keyVault';

const routes = [
  { path: '/', component: Login, meta: { hideBottomNav: true } },
  { path: '/categories', component: Categories, meta: { requiresAuth: true } },
  { path: '/accounts', component: Accounts, meta: { requiresAuth: true, hideBottomNav: true } },
  { path: '/account/:accountId', component: ShowAccount, meta: { requiresAuth: true, hideBottomNav: true } },
  { path: '/docCategories', component: DocCategories, meta: { requiresAuth: true } },
  { path: '/documents', component: Documents, meta: { requiresAuth: true, hideBottomNav: true } },
  { path: '/document/:documentId', component: ShowDocument, meta: { requiresAuth: true, hideBottomNav: true } },
  { path: '/noteCategories', component: NoteCategories, meta: { requiresAuth: true } },
  { path: '/login', component: Login, meta: { hideBottomNav: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }, // catch-all — must be las
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  // Wait for Firebase auth to initialize
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve();
    });
  });

  const isAuthenticated = authStore.currUser && authStore.currUser.userName && getKey();
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Clear authStore to ensure fresh state on redirect to login
    authStore.clearUser();
    next('/');
  } else {
    next();
  }
});

export default router;
