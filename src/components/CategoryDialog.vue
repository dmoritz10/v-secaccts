<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500px"
    persistent
  >
    <v-card>
      <v-card-title>
        {{ formData.categoryId ? "Edit Category" : "Add Category" }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="formData.name"
          label="Category Name"
          required
          variant="outlined"
          :rules="[(v) => !!v || 'Category name is required']"
        ></v-text-field>
        <v-checkbox
          v-model="formData.enc"
          label="Encrypted"
          color="primary"
        ></v-checkbox>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="$emit('cancel', formData)">Cancel</v-btn>
        <v-btn color="primary" @click="$emit('save', formData)">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  formData: {
    type: Object,
    required: true,
  },
});

defineEmits(["update:modelValue", "save", "cancel"]);
</script>
