<template>
  <div class="vue-container">
    <button @click="count++">Count is: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

top.mwHourglassHide();
</script>

<style scoped>
.vue-container {
  padding: 20px;
  background-color: #f0f8ff;
  border: 1px solid #c0d8f0;
  border-radius: 8px;
  text-align: center;
}
button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #3aa876;
}
</style>
