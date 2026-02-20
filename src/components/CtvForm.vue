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
      :label-width="effectiveLabelWidth"
      :label-position="labelPosition"
      :rules="rules"
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
  },
  labelPosition: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right', 'top'].includes(value)
  },
  rules: {
    type: Object,
    default: () => ({})
  }
});

import { provide, toRef, reactive } from 'vue';
provide('formModel', toRef(props, 'model'));

// 폼 포커스 상태 관리 (그리드 동기화 제어용)
const formFocusState = reactive({
  hasFocus: false,
  setFocus: (focused) => {
    formFocusState.hasFocus = focused;
    // 전역 이벤트로 폼 포커스 상태 브로드캐스트
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ctv-form-focus', {
        detail: { focused, formModel: props.model }
      }));
    }
  }
});
provide('formFocusState', formFocusState);

const formRef = ref(null);

// Grid Style for CSS Grid Layout
const gridStyle = computed(() => {
  const cols = Number(props.columns) || 1;
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '15px 20px', // row-gap handled by form-item margin
  };
});

// Handle label-width for top position
const effectiveLabelWidth = computed(() => {
  if (props.labelPosition === 'top') return 'auto';
  return props.labelWidth;
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
