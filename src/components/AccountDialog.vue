<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title
        >{{ formData.id ? "Edit Account" : "Add Account" }} for
        {{ categoryName }}</v-card-title
      >
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
        <v-checkbox v-model="formData.autoPay" label="Auto Pay"></v-checkbox>
        <v-text-field
          v-model="formData.login"
          label="Login"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          v-model="formData.password"
          label="Password"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          v-model="formData.pinNbr"
          label="PIN Number"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          v-model="formData.loginUrl"
          label="Login URL"
          variant="outlined"
        ></v-text-field>
        <v-textarea
          v-model="formData.securityQA"
          label="Security Q&A"
          variant="outlined"
        ></v-textarea>
        <v-textarea
          v-model="formData.notes"
          label="Notes"
          variant="outlined"
        ></v-textarea>
        <v-checkbox v-model="formData.favorite" label="Favorite"></v-checkbox>
        <v-checkbox v-model="formData.enc" label="Encrypted"></v-checkbox>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="
            $emit('save', {
              categoryId: formData.categoryId,
              categoryName,
              accountId: formData.id,
            })
          "
          >Save</v-btn
        >
        <v-btn
          color="error"
          @click="
            $emit('cancel', {
              categoryId: formData.categoryId,
              categoryName,
              accountId: formData.id,
            })
          "
          >Cancel</v-btn
        >
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
      accountNbr: "",
      autoPay: false,
      categoryId: "",
      login: "",
      loginUrl: "",
      notes: "",
      password: "",
      pinNbr: "",
      securityQA: "",
      favorite: false,
      enc: false,
    }),
  },
  categoryName: { type: String, default: "Category" },
});

defineEmits(["update:modelValue", "save", "cancel"]);
</script>
