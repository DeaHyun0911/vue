<template>
  <div class="ctv-form-wrapper">
    <!-- Optional Title -->
    <h3 v-if="title" class="ctv-form-title">{{ title }}</h3>
    
    <el-form
      ref="formRef"
      v-bind="$attrs"
      :model="model"
      class="ctv-form"
      :class="[`columns-${columns}`]"
      :label-width="labelWidth"
      :style="gridStyle"
    >
      <slot />
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  columns: {
    type: [Number, String],
    default: 1
  },
  labelWidth: {
    type: [String, Number],
    default: '120px' 
  }
});

import { provide } from 'vue';
provide('ctvFormModel', props.model);

const formRef = ref(null);

// Grid Style for CSS Grid Layout
const gridStyle = computed(() => {
  const cols = Number(props.columns) || 1;
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '0px 20px', // row-gap handled by form-item margin
  };
});

// Expose Element Plus Form methods transparently
const validate = (...args) => formRef.value?.validate(...args);
const validateField = (...args) => formRef.value?.validateField(...args);
const resetFields = (...args) => formRef.value?.resetFields(...args);
const scrollToField = (...args) => formRef.value?.scrollToField(...args);
const clearValidate = (...args) => formRef.value?.clearValidate(...args);

defineExpose({
  formRef,
  validate,
  validateField,
  resetFields,
  scrollToField,
  clearValidate
});
</script>

<style scoped>
.ctv-form-wrapper {
  width: 100%;
}

.ctv-form-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #333;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

.ctv-form {
  width: 100%;
}

/* Responsive adjustments if needed, though grid handles most */
@media (max-width: 768px) {
  .ctv-form {
    grid-template-columns: 1fr !important;
  }
}
</style>
