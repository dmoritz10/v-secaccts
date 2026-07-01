<template>
  <v-app class="grey lighten-4">
    <v-main>
      <router-view :key="$route.fullPath"></router-view>
    </v-main>
    <UiContainer />

    <v-bottom-navigation v-if="showBottomNav" v-model="activeTab" grow color="primary">
      <!-- Changed value to match 'categories' -->
      <v-btn value="categories" @click="selectTab('categories')">
        <v-icon>mdi-shield-lock-outline</v-icon>
        <span>Accounts</span>
      </v-btn>

      <!-- Changed value to match 'docCategories' -->
      <v-btn value="docCategories" @click="selectTab('docCategories')">
        <v-icon>mdi-file-account-outline</v-icon>
        <span>Documents</span>
      </v-btn>

      <!-- Fixed typo 'setings' -> 'settings' to match your method parameter -->
      <v-btn value="settings" @click="selectTab('settings')">
        <v-icon>mdi-cog-outline</v-icon>
        <span>Settings</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup>
import UiContainer from './ui/UiContainer.vue';

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const showBottomNav = computed(() => !route.meta.hideBottomNav);

const activeTab = computed(() => {
  if (route.path.startsWith('/docCategories')) return 'docCategories';
  if (route.path.startsWith('/settings')) return 'settings'; // no trailing spaces
  return 'categories';
});

function selectTab(tab) {
  if (tab === activeTab.value) return;
  if (tab === 'categories') router.push('/categories');
  else if (tab === 'docCategories') router.push('/docCategories');
  else if (tab === 'settings') router.push('/settings');
  else router.push('/categories');
}
</script>
