<template>
  <v-dialog v-model="modelValue" max-width="500px" persistent>
    <v-card>
      <v-card-title>{{ localData.id ? "Edit Category" : "Add Category" }}</v-card-title>
      <v-card-text>
        <v-form ref="editForm">
          <v-text-field v-model.trim="localData.name" persistent-placeholder label="* Category Name" variant="outlined" :rules="[(v) => !!v || 'Required']"/>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="$emit('cancel')">Cancel</v-btn>
        <v-btn color="primary" @click="saveEdit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, toRaw } from "vue";

const modelValue = defineModel(); // Dialog visibility
const props = defineProps({
  category: { type: Object, required: true }, // The blueprint or record
});
const emit = defineEmits(["save", "cancel"]);

const editForm = ref(null);

// 4. Create the sandbox using structuredClone
// This is modern, fast, and breaks all reactive links to the store.
const localData = ref(JSON.parse(JSON.stringify(props.category)));

async function saveEdit() {
  const { valid } = await editForm.value?.validate();
  if (valid) {
    // 5. Send a clean, deep-cloned copy back to the store
    emit("save", JSON.parse(JSON.stringify(localData.value)));
  }
}
</script>
