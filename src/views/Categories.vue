<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!categoryStore.isLoaded || !accountStore.isLoaded"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(filteredCategories)">
      <v-row
        class="mx-0 pa-0 py-0 pb-2"
        :style="{ backgroundColor: '#f5f5f9' }"
      >
        <v-col cols="12" class="pb-0">
          <v-toolbar flat color="transparent">
            <v-toolbar-title class="text-h5">Categories</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="categoryStore.openCategoryDialog()">
              <v-icon left>mdi-plus</v-icon> Add Category
            </v-btn>
          </v-toolbar>
          <v-text-field
            :model-value="categoryStore.searchQuery"
            @update:modelValue="categoryStore.searchQuery = $event"
            label="Search Categories"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
            class="mb-4"
          ></v-text-field>
        </v-col>
      </v-row>
      <div class="category-stats">
        <span
          >{{ categoryStore.numberOfFilteredCategories }}
          {{
            categoryStore.numberOfFilteredCategories === 1
              ? "Category"
              : "Categories"
          }}</span
        >
      </div>
      <div
        v-if="categoryStore.numberOfFilteredCategories === 0"
        class="no-categories"
      >
        No categories found. Add one to get started!
      </div>
      <v-row
        dense
        class="mx-0 pa-0 mt-0 mb-3 pt-2"
        v-for="cat in filteredCategories"
        :key="cat.id"
      >
        <v-col cols="12" sm="6" md="4">
          <v-card
            :id="'category-' + cat.id"
            @click="goToAccounts(cat)"
            class="category-card"
          >
            <v-card-title class="wrap-card-title">{{
              cat.name || "Unnamed Category"
            }}</v-card-title>
            <v-card-actions>
              <v-btn
                color="primary"
                @click.stop="categoryStore.openCategoryDialog(cat)"
                >Edit</v-btn
              >
              <v-btn
                color="error"
                @click.stop="categoryStore.deleteCategory(cat.id)"
                >Delete</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <div v-else>
      <p>
        Error: Failed to load categories. Please check your connection and try
        again.
      </p>
    </div>

    <!-- Category Dialog -->
    <CategoryDialog
      v-model="categoryStore.dialog"
      :form-data="categoryStore.formData"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </v-container>
</template>

<script setup>
import { computed, watch, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCategoryStore } from "@/stores/category";
import { useAccountStore } from "@/stores/account";
import CategoryDialog from "@/components/CategoryDialog.vue";

const router = useRouter();
const route = useRoute();
const categoryStore = useCategoryStore();
const accountStore = useAccountStore();

const filteredCategories = computed(() => {
  const categories = categoryStore.filteredCategories;
  console.log(
    "Categories.vue filteredCategories:",
    categories,
    "dialog:",
    categoryStore.dialog
  );
  return categories;
});

watch(
  () => categoryStore.searchQuery,
  (newQuery) => {
    console.log("Categories.vue searchQuery changed:", newQuery);
  },
  { immediate: true }
);

onMounted(async () => {
  try {
    console.log("Categories.vue mounted, fetching data...");
    await Promise.all([
      categoryStore.fetchCategories(),
      categoryStore.subscribeToCategories(),
      accountStore.fetchAccounts(),
      accountStore.subscribeToAccounts(),
    ]);
    console.log(
      "Categories.vue initial fetch complete, categoryStore.isLoaded:",
      categoryStore.isLoaded,
      "accountStore.isLoaded:",
      accountStore.isLoaded,
      "dialog:",
      categoryStore.dialog
    );
  } catch (error) {
    console.error("Categories.vue onMounted failed:", error);
    categoryStore.state.isLoaded = false;
    accountStore.state.isLoaded = false;
  }
});

const scrollToCategory = (scrollTo) => {
  if (scrollTo && typeof scrollTo === "string") {
    nextTick(() => {
      const container = document.querySelector(".v-container");
      if (container) container.scrollTop = 0;
      document.querySelectorAll(".category-card").forEach((el) => {
        el.classList.remove("sheets-focus");
      });
      const element = document.getElementById(`category-${scrollTo}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        element.classList.add("sheets-focus");
        console.log(`Scrolled to category: ${scrollTo}`);
      } else {
        console.warn(`Category element not found: category-${scrollTo}`);
      }
    });
  }
};

watch(
  () => ({ ...route.query, ts: route.query.ts }),
  (newQuery) => {
    nextTick(() => {
      console.log(
        "Categories.vue watch triggered, scrollTo:",
        newQuery.scrollTo,
        "ts:",
        newQuery.ts
      );
      scrollToCategory(newQuery.scrollTo);
    });
  },
  { immediate: true, deep: true }
);

const goToAccounts = (category) => {
  router.push({
    path: "/accounts",
    query: { id: category.id, name: category.name, ts: Date.now() },
  });
};

const handleSave = async (payload) => {
  try {
    console.log("Categories.vue handleSave, payload:", payload);
    const categoryId = await categoryStore.saveCategory();
    console.log("Saved category ID:", categoryId);
    await categoryStore.fetchCategories();
    await nextTick();
    await nextTick();
    categoryStore.closeCategoryDialog();
    const targetId = payload.categoryId ? payload.categoryId : categoryId;
    if (targetId && typeof targetId === "string") {
      router.push({
        path: "/categories",
        query: { scrollTo: targetId, ts: Date.now() },
      });
    } else {
      console.warn("Invalid categoryId:", targetId);
      router.push({ path: "/categories", query: { ts: Date.now() } });
    }
  } catch (error) {
    console.error("Categories.vue handleSave failed:", error);
  }
};

const handleCancel = (payload) => {
  console.log("Categories.vue handleCancel, payload:", payload);
  const categoryId = payload.categoryId;
  categoryStore.closeCategoryDialog();
  if (categoryId && typeof categoryId === "string") {
    router.push({
      path: "/categories",
      query: { scrollTo: categoryId, ts: Date.now() },
    });
  } else {
    router.push({ path: "/categories", query: { ts: Date.now() } });
  }
};
</script>

<style scoped src="@/assets/index.css"></style>
