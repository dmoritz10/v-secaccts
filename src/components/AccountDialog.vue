<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue')" max-width="600">
    <v-card>
      <v-card-title>{{ formData.accountId ? "Edit Account" : "Add Account" }} </v-card-title>
      <v-card-text>
        <v-form ref="editForm">
          <v-text-field
            v-model="formData.provider"
            label="Provider"
            variant="outlined"
            :rules="[providerExistsRule]"
            required
          ></v-text-field>
          <v-select
            v-model="formData.categoryId"
            label="Category"
            :items="categoryStore.state.items"
            item-title="name"
            item-value="id"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Category is required']"
          ></v-select>
          <v-text-field v-model="formData.login" label="Login" variant="outlined" clearable></v-text-field>
          <v-text-field v-model="formData.password" label="Password" variant="outlined" clearable></v-text-field>

          <!--   -->
          <!-- :type="showPassword ? 'text' : 'password'" -->
          <!-- :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'" -->
          <!-- @click:append-inner="showPassword = !showPassword" -->

          <v-text-field
            v-model="formData.accountNbr"
            label="Account Number"
            variant="outlined"
            clearable
          ></v-text-field>
          <v-text-field v-model="formData.loginUrl" label="Login URL" variant="outlined" clearable></v-text-field>
          <v-text-field v-model="formData.autoPay" label="Auto Pay Info" variant="outlined" clearable></v-text-field>
          <v-text-field v-model="formData.pinNbr" label="PIN Number" variant="outlined" clearable></v-text-field>
          <v-textarea v-model="formData.securityQA" label="Security Q&A" variant="outlined" clearable></v-textarea>
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
import { useCategoryStore } from "@/stores/category";
import { useAccountStore } from "@/stores/account";
import { ref, onMounted, computed } from "vue";

const categoryStore = useCategoryStore();
const accountStore = useAccountStore();
const showPassword = ref(false); // Toggle for password visibility
const editForm = ref(null);

const providerExistsRule = computed(() => {
  return (value) => {
    if (!value) return "Provider is required";

    // Normalize input (trim + lowercase if needed)
    const normalized = value.trim().toLowerCase();

    // Check against existing providers
    const exists = accountStore.state.items.some(
      (item) =>
        item.provider.trim().toLowerCase() === normalized &&
        // If editing, ignore the same account
        item.id !== props.formData.accountId
    );

    if (exists) {
      return "This provider already exists";
    }
    return true;
  };
});

async function saveEdit($event) {
  const { valid } = await editForm.value?.validate();
  console.log(valid);

  if (valid) {
    console.log("valid");
    emit("save", props.formData);
  }
}

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  formData: {
    type: Object,
    required: true,
  },
});
console.log("AccountDialog", props.formData);

const emit = defineEmits(["update:modelValue", "save", "cancel"]);
</script>
