<template>
  <v-container fluid class="h-100">
    <v-progress-circular
      v-if="!state.isLoaded.categories || filteredCats === undefined"
      indeterminate
      color="primary"
      class="ma-16 d-flex justify-center"
    ></v-progress-circular>
    <template v-else-if="Array.isArray(filteredCats)">
      <v-container fluid class="ma-0 pa-0">
        <!-- sheet -->
        <v-row
          class="position-sticky top-0 mx-0 px-0 mb-2"
          style="z-index: 20; background-color: #f9f9f9"
        >
          <v-col cols="12" class="pb-0 px-0">
            <v-sheet
              class="mx-3 px-4 pt-6 pb-5 mt-1 mb-0 border"
              elevation="0"
              rounded
            >
              <v-row class="align-center justify-center">
                <h1 class="subtitle-1 grey--text text-center">
                  Secure Accounts
                </h1>
              </v-row>
              <v-row>
                <v-col class="text-center">
                  <h2 class="text-success">{{ nbrCats }}</h2>
                  <p class="subtitle-1 grey--text text-center">Categories</p>
                </v-col>

                <v-col class="text-center" col="3">
                  <h2 class="text-success">{{ nbrAccts }}</h2>
                  <p class="subtitle-1 grey--text text-center">Accounts</p>
                </v-col>
              </v-row>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- search -->
        <v-row class="mx-0 px-0 my-0 pb-1" style="background-color: #f9f9f9">
          <v-col cols="12" class="pb-0">
            <v-text-field
              v-model="state.categories.searchQuery"
              label="Search Categories or Account Providers"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="search-field border rounded"
              hide-details
              height="20"
              elevation="0"
              style="background-color: white"
            />
          </v-col>
        </v-row>

        <!-- cards -->
        <v-row
          dense
          class="mx-0 px-0 mt-0 mb-3 pt-2"
          style="background-color: #f9f9f9"
        >
          <v-col v-for="cat in filteredCats" :key="cat.id" cols="12">
            <v-card
              elevation="2"
              class="d-flex align-center pa-2 mx-3"
              color="amber-lighten-4"
              :id="`category-${cat.id}`"
              :class="{
                'sheets-focus': state.categories.selectedCardId === cat.id,
              }"
              @click="goToAccounts(cat)"
            >
              <v-card-title class="text-h6 wrap-card-title">
                {{ cat.name }}
              </v-card-title>
              <v-spacer></v-spacer>
              <v-btn
                flat
                outlined
                :class="[
                  'crypt-btn',
                  'close-btn',
                  cat.enc ? 'bg-red-lighten-2' : 'bg-green-lighten-2',
                ]"
                @click="cryptCat(cat)"
              >
                {{ cat.enc ? "decrypt" : "encrypt" }} </v-btn
              ><v-btn
                icon
                small
                flat
                outlined
                class="transparent-btn close-btn"
                @click.stop="openCategoryDialog(cat)"
              >
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn
                icon
                small
                outlined
                class="transparent-btn close-btn"
                @click.stop="deleteCategory(cat.id)"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- add button -->
      <v-btn
        icon
        fab
        class="add-btn align-center justify-center"
        style="
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
        "
        @click="openCategoryDialog"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <!-- Category Dialog -->
      <v-dialog v-model="state.categories.dialog" max-width="500">
        <v-card>
          <v-card-title>{{
            state.categories.formData.id ? "Edit Category" : "Add Category"
          }}</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="state.categories.formData.name"
              label="Category Name"
              variant="outlined"
              required
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="saveCategory">Save</v-btn>
            <v-btn color="error" @click="closeCategoryDialog">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
    <div v-else>
      <p>
        Error: Failed to load categories. Please check your connection and try
        again.
      </p>
    </div>

    <!-- Category Dialog -->
    <v-dialog v-if="state" v-model="state.categories.dialog" max-width="500">
      <v-card>
        <v-card-title>{{
          state.categories.formData.id ? "Edit Category" : "Add Category"
        }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="state.categories.formData.name"
            label="Category Name"
            variant="outlined"
            :rules="[(v) => !!v || 'Category name is required']"
            required
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="saveCategory">Save</v-btn>
          <v-btn color="error" @click="closeCategoryDialog">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import {
  reactive,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

const router = useRouter();
const route = useRoute();

const state = reactive({
  categories: {
    items: [], // Ensure empty array
    constants: { collectionName: "categories" },
    searchQuery: "",
    dialog: false,
    formData: { id: null, name: "" },
  },
  isLoaded: {
    categories: false,
  },
});

const filteredCats = computed(() => {
  try {
    const items = Array.isArray(state.categories.items)
      ? state.categories.items
      : [];
    if (!items.length && state.isLoaded.categories) {
      console.log("No categories available after loading");
    }
    const filtered = items
      .filter((cat) => {
        if (!cat || !cat.id || !cat.name) {
          console.warn("Invalid category in filteredCats:", cat);
          return false;
        }
        if (!state.categories.searchQuery) return true;
        const query = state.categories.searchQuery.toLowerCase();
        return cat.name.toLowerCase().includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name
    return filtered;
  } catch (error) {
    console.error("Error computing filteredCats:", error);
    return [];
  }
});

const nbrCats = computed(() => {
  return filteredCats.value.length;
});

const nbrAccts = "\u00A0";

let unsubscribeCats = null;

onMounted(async () => {
  console.log("Setting up onSnapshot for categories in Categories.vue");
  unsubscribeCats = onSnapshot(
    collection(db, state.categories.constants.collectionName),
    async (querySnapshot) => {
      state.categories.items = querySnapshot.docs
        .map((doc, index) => {
          const data = doc.data();
          const item = { id: doc.id, ...data };
          if (!item.id || !item.name) {
            console.warn(`Invalid category[${index}] document:`, item);
            return null;
          }
          return item;
        })
        .filter((item) => item !== null);

      state.isLoaded.categories = true;
      await nextTick();
      console.log("nextTick triggered after onSnapshot in Categories.vue");
      if (route.query.id) {
        await nextTick(); // Ensure DOM is updated
        const element = document.getElementById(`category-${route.query.id}`);
        if (element) {
          console.log(`Scrolling to category with id: ${route.query.id}`);
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          console.warn(
            `Category element with id category-${route.query.id} not found`
          );
        }
      }
    },
    (error) => {
      console.error("Error in categories onSnapshot:", error);
      state.isLoaded.categories = true; // Allow error display
    }
  );
});

onUnmounted(() => {
  if (unsubscribeCats) unsubscribeCats();
});

const goToAccounts = async (cat) => {
  if (!cat || !cat.id) return;
  try {
    // Update current route (/categories) with category id in query
    await router.replace({
      path: "/categories",
      query: { id: cat.id },
    });
    // Navigate to accounts with id and name
    await router.push({
      path: "/accounts",
      query: { id: cat.id, name: cat.name || "Unnamed Category" },
    });
  } catch (error) {
    console.error("Error navigating to accounts:", error);
  }
};

const openCategoryDialog = (cat = null) => {
  state.categories.formData = cat
    ? { id: cat.id, name: cat.name || "" }
    : { id: null, name: "" };
  state.categories.dialog = true;
};

const closeCategoryDialog = () => {
  state.categories.dialog = false;
  state.categories.formData = { id: null, name: "" };
};

const deleteCategory = async (id) => {
  if (!id) return;
  try {
    await deleteDoc(doc(db, state.categories.constants.collectionName, id));
  } catch (error) {
    console.error("Failed to delete category:", error);
  }
};

const saveCategory = async () => {
  try {
    const { id, name } = state.categories.formData;
    if (!name) throw new Error("Category name is required");
    let newCategoryId = id;
    if (id) {
      await setDoc(
        doc(db, state.categories.constants.collectionName, id),
        { name },
        { merge: true }
      );
    } else {
      const newDocRef = doc(
        collection(db, state.categories.constants.collectionName)
      );
      newCategoryId = newDocRef.id;
      await setDoc(newDocRef, { name });
    }
    closeCategoryDialog();
    // Wait for Firestore to update and DOM to render
    await nextTick();
    await nextTick(); // Double nextTick for reliability
    const element = document.getElementById(`category-${newCategoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      console.warn(
        `Category element with id category-${newCategoryId} not found`
      );
    }
  } catch (error) {
    console.error("Failed to save category:", error);
  }
};

watch(
  () => filteredCats.value,
  (newValue) => {
    // console.log("filteredCats updated in Categories.vue:", newValue);
  },
  { immediate: true }
);
</script>

<style scoped>
.crypt-btn {
  font-size: 12px !important; /* Smaller text for account buttons */
  text-transform: lowercase !important; /* Lowercase text */
  font-weight: bold !important; /* Bold text */
  padding-left: 4px !important; /* Reduced left padding */
  padding-right: 4px !important; /* Reduced right padding */
}
</style>
