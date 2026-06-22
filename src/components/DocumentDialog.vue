<template>
  <!-- <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue')" max-width="600"> -->
  <v-dialog v-model="modelValue" max-width="500px" persistent>
    <v-card>
      <v-card-title>{{ formData.documentId ? 'Edit Document' : 'Add Document' }}</v-card-title>
      <v-card-text>
        <v-form ref="editForm">
          <v-select
            v-model="formData.docCategoryId"
            label="Category"
            :items="docCategoryStore.state.items"
            item-title="name"
            item-value="id"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Category is required']"></v-select>

          <v-text-field
            v-model="formData.name"
            label="Name"
            variant="outlined"
            :rules="[nameExistsRule]"
            required></v-text-field>

          <v-text-field v-model="formData.provider" label="Provider" variant="outlined" required></v-text-field>
          <v-text-field v-model="formData.docNbr" label="Document Nbr" variant="outlined" clearable></v-text-field>
          <v-text-field v-model="formData.pinNbr" label="Pin Nbr" variant="outlined" clearable></v-text-field>
          <v-textarea v-model="formData.notes" label="Notes" variant="outlined" clearable></v-textarea>
          <v-checkbox v-model="formData.favorite" label="Favorite"></v-checkbox>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveEdit(formData)">Save</v-btn>
        <v-btn color="error" @click="$emit('cancel', {})">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
// import { defineProps, defineEmits } from "vue";
import { useDocCategoryStore } from '@/stores/docCategory';
import { useDocumentStore } from '@/stores/document';
import { ref, computed } from 'vue';

const docCategoryStore = useDocCategoryStore();
const documentStore = useDocumentStore();
const editForm = ref(null);

const nameExistsRule = computed(() => {
  return (value) => {
    if (!value) return 'Document Name is required';

    // Normalize input (trim + lowercase if needed)
    const normalized = value.trim().toLowerCase();

    // Check against existing providers
    const exists = documentStore.state.items.some(
      (item) =>
        item.name.trim().toLowerCase() === normalized &&
        // If editing, ignore the same account
        item.id !== props.formData.documentId
    );

    if (exists) {
      return 'This Document name already exists';
    }
    return true;
  };
});

async function saveEdit($event) {
  const { valid } = await editForm.value?.validate();

  if (valid) {
    emit('save', props.formData);
  }
}
const modelValue = defineModel();

const props = defineProps({
  // modelValue: { type: Boolean, required: true },
  formData: {
    type: Object,
    required: true,
  },
});

// const emit = defineEmits(["update:modelValue", "save", "cancel"]);
const emit = defineEmits(['save', 'cancel']);
</script>
