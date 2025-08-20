<template>
  <v-app class="grey lighten-4">
    <v-main>
      <router-view :key="$route.fullPath"></router-view>
    </v-main>
    <UiContainer />
  </v-app>
</template>

<script setup>
import UiContainer from "./ui/UiContainer.vue";
</script>

<style scoped>
.grey.lighten-4 {
  background-color: #f5f5f5 !important;
}
</style>
