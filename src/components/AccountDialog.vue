<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>{{
        formData.id ? "Edit Account" : "Add Account"
      }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="formData.provider"
          label="Provider"
          variant="outlined"
          :rules="[(v) => !!v || 'Provider is required']"
          required
        ></v-text-field>
        <v-text-field
          v-model="formData.accountNbr"
          label="Account Number"
          variant="outlined"
        ></v-text-field>
        <v-checkbox
          v-model="formData.autoPay"
          label="Auto Pay"
          :true-value="true"
          :false-value="false"
        ></v-checkbox>
        <v-text-field
          v-model="formData.categoryId"
          label="Category ID"
          variant="outlined"
          :rules="[(v) => !!v || 'Category ID is required']"
          required
        ></v-text-field>
        <v-checkbox
          v-model="formData.enc"
          label="Encrypted"
          :true-value="true"
          :false-value="false"
        ></v-checkbox>
        <v-checkbox
          v-model="formData.favorite"
          label="Favorite"
          :true-value="true"
          :false-value="false"
        ></v-checkbox>
        <v-text-field
          v-model="formData.login"
          label="Login"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          v-model="formData.loginUrl"
          label="Login URL"
          variant="outlined"
          type="url"
        ></v-text-field>
        <v-textarea
          v-model="formData.notes"
          label="Notes"
          variant="outlined"
        ></v-textarea>
        <v-text-field
          v-model="formData.password"
          label="Password"
          variant="outlined"
          type="password"
        ></v-text-field>
        <v-text-field
          v-model="formData.pinNbr"
          label="PIN Number"
          variant="outlined"
        ></v-text-field>
        <v-textarea
          v-model="formData.securityQA"
          label="Security Q&A"
          variant="outlined"
        ></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="$emit('save')">Save</v-btn>
        <v-btn color="error" @click="$emit('cancel')">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

defineProps({
  modelValue: { type: Boolean, required: true },
  formData: {
    type: Object,
    required: true,
    default: () => ({
      id: null,
      provider: "",
      accountNbr: null,
      autoPay: false,
      categoryId: "",
      enc: false,
      favorite: false,
      login: null,
      loginUrl: "",
      notes: "",
      password: null,
      pinNbr: null,
      securityQA: null,
    }),
  },
});

defineEmits(["update:modelValue", "save", "cancel"]);
</script>
