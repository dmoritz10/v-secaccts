<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props }">
      <v-btn color="success" v-bind="props">Add New Project</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <h2>Add a New Project</h2>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" class="px-3">
          <v-text-field
            v-model="title"
            label="Title"
            prepend-icon="mdi-folder"
            :rules="inputRules"
          ></v-text-field>
          <v-textarea
            v-model="content"
            label="Information"
            prepend-icon="mdi-pencil"
            :rules="inputRules"
          ></v-textarea>
          <v-menu v-model="menu" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-text-field
                v-model="formattedDate"
                label="Due date"
                prepend-icon="mdi-calendar"
                :rules="inputRules"
                clearable
                v-bind="props"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="due"
              @update:model-value="menu = false"
            ></v-date-picker>
          </v-menu>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              class="ma-0 mt-3"
              :loading="loading"
              @click="submit"
              >Add Project</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed } from "vue";
import { format } from "date-fns";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export default {
  name: "Popup",
  setup(props, { emit }) {
    const dialog = ref(false);
    const title = ref("");
    const content = ref("");
    const due = ref(null);
    const menu = ref(false);
    const loading = ref(false);
    const form = ref(null);
    const inputRules = [
      (v) => !!v || "This field is required",
      (v) => v.length >= 3 || "Minimum length is 3 characters",
    ];

    const formattedDate = computed(() => {
      return due.value ? format(new Date(due.value), "do MMM yyyy") : "";
    });

    const submit = async () => {
      const { valid } = await form.value.validate();
      if (valid) {
        loading.value = true;
        const project = {
          title: title.value,
          content: content.value,
          due: due.value ? format(new Date(due.value), "do MMM yyyy") : "",
          person: "The Net Ninja",
          status: "ongoing",
        };
        try {
          await addDoc(collection(db, "projects"), project);
          loading.value = false;
          dialog.value = false;
          title.value = "";
          content.value = "";
          due.value = null;
          emit("projectAdded");
        } catch (error) {
          console.error("Error adding project:", error);
          loading.value = false;
        }
      }
    };

    return {
      dialog,
      title,
      content,
      due,
      menu,
      loading,
      form,
      inputRules,
      formattedDate,
      submit,
    };
  },
};
</script>
