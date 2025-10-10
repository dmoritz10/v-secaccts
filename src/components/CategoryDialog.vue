<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue')" max-width="500px" persistent>
    <v-card>
      <v-card-title>
        {{ formData.categoryId ? "Edit Category" : "Add Category" }}
      </v-card-title>
      <v-card-text>
        <v-form ref="editForm">
          <v-text-field
            v-model="formData.name"
            label="Category Name"
            required
            variant="outlined"
            :rules="[(v) => !!v || 'Category name is required']"
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="$emit('cancel', formData)">Cancel</v-btn>
        <v-btn color="primary" @click="saveEdit(formData)">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from "vue";

const editForm = ref(null);

async function saveEdit($event) {
  const { valid } = await editForm.value?.validate();
  console.log(valid);

  if (valid) {
    console.log("valid");
    emit("save", props.formData);
  }
}
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  formData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "save", "cancel"]);
</script>
