<template>
  <!-- <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue')" max-width="600"> -->
  <v-dialog v-model="modelValue" max-width="500px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center sticky-header border-b mx-2">
        <span>{{ formData.accountId ? 'Edit Account' : 'Add Account' }}</span>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" class="px-0" @click="saveEdit(formData)">Save</v-btn>
        <v-btn color="error" variant="text" class="px-0" @click="$emit('cancel', {})">Cancel</v-btn>
      </v-card-title>
      <v-card-text>
        <v-form ref="editForm">
          <v-row dense>
            <v-col cols="8">
              <v-select
                v-model="formData.categoryId"
                label="Category"
                autocomplete="off"
                :items="categoryStore.state.items"
                item-title="name"
                item-value="id"
                variant="outlined"
                required
                :rules="[(v) => !!v || 'Category is required']"></v-select>
            </v-col>
            <v-col cols="4">
              <v-select v-model="formData.owner" label="Owner" :items="['D', 'C', '']" variant="outlined"></v-select>
            </v-col>
          </v-row>
          <v-text-field
            v-model="formData.provider"
            label="Provider"
            autocomplete="off"
            autofocus
            variant="outlined"
            :rules="[providerExistsRule]"
            required></v-text-field>

          <v-text-field
            v-model="formData.login"
            label="Login"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.password"
            label="Password"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.accountNbr"
            label="Account Number"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.loginUrl"
            label="Login URL"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.autoPay"
            label="Auto Pay Info"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-text-field
            v-model="formData.pinNbr"
            label="PIN Number"
            autocomplete="off"
            variant="outlined"
            clearable></v-text-field>
          <v-textarea
            v-model="formData.securityQA"
            label="Security Q&A"
            autocomplete="off"
            variant="outlined"
            clearable></v-textarea>
          <v-textarea
            v-model="formData.notes"
            label="Notes"
            autocomplete="off"
            variant="outlined"
            clearable></v-textarea>
          <v-checkbox v-model="formData.favorite" label="Favorite"></v-checkbox>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
// import { defineProps, defineEmits } from "vue";
import { useCategoryStore } from '@/stores/category';
import { useAccountStore } from '@/stores/account';
import { ref, computed } from 'vue';

const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const showPassword = ref(false); // Toggle for password visibility
const editForm = ref(null);

const providerExistsRule = computed(() => {
  return (value) => {
    if (!value) return 'Provider is required';

    // Normalize input (trim + lowercase if needed)
    const normalized = value.trim().toLowerCase();

    // Check against existing providers
    const exists = accountStore.state.items.some(
      (item) =>
        item.provider.trim().toLowerCase() === normalized &&
        // If editing, ignore the same account
        item.id !== props.formData.accountId
    );
    console.log('exists', props.formData, props.formData.accountId);
    if (exists) {
      return 'This provider already exists';
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
<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: white;
  gap: 8px;
}
</style>
