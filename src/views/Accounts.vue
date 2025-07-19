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
            <h1 class="subtitle-1 grey--text text-center">
              {{ categoryName }}
            </h1>
          </v-row>
          <v-row>
            <v-col class="text-center" col="3">
              <h2 class="text-success">{{ nbrFilteredAccts }}</h2>
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
          v-model="state.accounts.searchQuery"
          label="Search Providers"
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
      <v-col v-for="acct in filteredAccts" :key="acct.id" cols="12">
        <v-card
          elevation="2"
          class="d-flex align-center pa-2 mx-3"
          color="amber-lighten-4"
          :class="{
            'sheets-focus': state.accounts.selectedCardId === acct.id,
          }"
          @click="selectAccountCard(acct.id)"
        >
          <v-card-title class="text-h6 wrap-card-title">
            {{ acct.provider }}
          </v-card-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            small
            flat
            outlined
            class="transparent-btn close-btn"
            @click.stop="openAccountDialog(acct)"
          >
            <v-icon>mdi-pencil-outline</v-icon>
          </v-btn>
          <v-btn
            icon
            small
            outlined
            class="transparent-btn close-btn"
            @click.stop="deleteAccount(acct.id)"
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
    @click="openAccountDialog"
  >
    <v-icon>mdi-plus</v-icon>
  </v-btn>

  <!-- Accoiunt Dialog -->
  <v-dialog v-model="state.accounts.dialog" max-width="500">
    <v-card>
      <v-card-title>{{
        state.accounts.formData.id ? "Edit Account" : "Add Account"
      }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="state.accounts.formData.provider"
          label="Account Name"
          variant="outlined"
          required
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveAccount">Save</v-btn>
        <v-btn color="error" @click="closeAccountDialog">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useDB } from "@/composables/useDB";

import { useRoute } from "vue-router";
const route = useRoute();
const categoryName = route.params.categoryName;

const {
  state,
  filteredAccts,
  nbrFilteredAccts,
  openAccountDialog,
  closeAccountDialog,
  deleteAccount,
  saveAccount,
  selectAccountCard,
} = useDB();
</script>
