<template>
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
            <h1 class="subtitle-1 grey--text text-center">Secure Accounts</h1>
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
          v-model="searchQuery"
          label="Search Categories"
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
          :class="{ 'sheets-focus': selectedCardId === cat.id }"
          @click="selectCard(cat.id)"
        >
          <v-card-title class="text-h6 wrap-title" @click="listAccts(cat)">
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
            @click="editCategory(cat)"
          >
            <v-icon>mdi-pencil-outline</v-icon>
          </v-btn>
          <v-btn
            icon
            small
            outlined
            class="transparent-btn close-btn"
            @click="deleteCategory(cat.id)"
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
    @click="addCategory"
  >
    <v-icon>mdi-plus</v-icon>
  </v-btn>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/firebase"; // Adjust path to your Firebase config
import { getCats, getAccts } from "../common";

const cats = ref([]);
const accts = ref([]);
const searchQuery = ref("");
const nbrCats = computed(() => filteredCats.value.length);
const nbrAccts = computed(() => accts.value.length);
const selectedCardId = ref(null);

const filteredCats = computed(() => {
  if (!searchQuery.value) return cats.value;
  const query = searchQuery.value.toLowerCase();
  return cats.value.filter((cat) => cat.name.toLowerCase().includes(query));
});

const selectCard = (id) => {
  selectedCardId.value = id;
};

const editCategory = (category) => {
  // Implement edit functionality
  console.log("Edit category:", category);
};

const deleteCategory = async (id) => {
  try {
    await deleteDoc(doc(db, "categories", id));
    cats.value = cats.value.filter((cat) => cat.id !== id);
  } catch (error) {
    console.error("Error deleting category:", error);
  }
};

const addCategory = async () => {
  try {
    console.log("Add category");
    const newCategory = {
      name: "New Category", // Replace with user input or form
      enc: false,
      createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, "categories"), newCategory);
    cats.value.push({ id: docRef.id, ...newCategory });
  } catch (error) {
    console.error("Error adding category:", error);
  }
};

const cryptCat = async (cat) => {
  if (cat.enc) {
  } else {
  }
  cat.enc = !cat.enc;
};

const listAccts = async (cat) => {
  console.log("listAccts", cat);
};

onMounted(async () => {
  cats.value = await getCats();
  accts.value = await getAccts();
});
</script>

<style scoped>
.v-card {
  transition: all 0.3s;
}
.v-card:hover {
  background-color: #f5f5f5;
}
.v-card.sheets-focus {
  box-shadow: rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset,
    rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset !important;
}

.transparent-btn {
  background-color: transparent !important;
  box-shadow: none !important;
  margin-right: -2px !important; /* Negative margin to bring buttons closer */
}
.transparent-btn:hover {
  background-color: transparent !important;
}
.transparent-btn .v-btn__underlay {
  background-color: transparent !important;
}

.crypt-btn {
  font-size: 12px !important; /* Smaller text for account buttons */
  text-transform: lowercase !important; /* Lowercase text */
  font-weight: bold !important; /* Bold text */
  padding-left: 4px !important; /* Reduced left padding */
  padding-right: 4px !important; /* Reduced right padding */
}
.wrap-title {
  white-space: normal !important; /* Allow text wrapping */
  flex: 1 1 auto !important; /* Allow title to take available space and wrap */
}

.add-btn {
  background-color: #1976d2 !important; /* Blue to match edit/delete */
  color: #ffffff !important; /* White icon for contrast */
  opacity: 0.8 !important; /* Semi-transparent */
}
.add-btn:hover {
  background-color: #1565c0 !important; /* Darker blue on hover */
  opacity: 1 !important; /* Fully opaque on hover */
}
.add-btn .v-btn__underlay {
  background-color: transparent !important;
}

.sheets-focus {
  box-shadow: rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset,
    rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset !important;
}
</style>
