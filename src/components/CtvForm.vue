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
      <!-- 선언적 필드 렌더링 (CtvQueryFilter 스타일) -->
      <template v-for="(fieldDef, idx) in resolvedFields" :key="fieldDef.field || idx">
        <ctv-form-item 
          :label="fieldDef.title || fieldDef.label" 
          :prop="fieldDef.field"
          :span="fieldDef.span"
          v-if="fieldDef.visible !== false"
        >
          <component 
            :is="fieldDef.component" 
            v-bind="fieldDef"
            :field="fieldDef.field"
          />
        </ctv-form-item>
      </template>

      <!-- 직접 작성하는 Slot -->
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
  },
  /**
   * 선언적 필드 설정
   * Array: [{ component: 'ctv-input', field: 'NAME', title: '성명' }, ...]
   * Object (필드 중심): { NAME: { component: 'ctv-input', title: '성명' }, ... }
   */
  fields: {
    type: [Array, Object],
    default: () => []
  }
});

const resolvedFields = computed(() => {
  if (Array.isArray(props.fields)) {
    return props.fields;
  }
  
  // Object 형식인 경우 Array로 변환 (Key를 field로 사용)
  if (props.fields && typeof props.fields === 'object') {
    return Object.entries(props.fields).map(([key, value]) => {
      return {
        field: key,
        ...value
      };
    });
  }
  
  return [];
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
    gap: '8px 20px', // row-gap handled by form-item margin
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
