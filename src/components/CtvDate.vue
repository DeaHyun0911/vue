<template>
  <div 
    class="ctv-date-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError, 'is-required': required }"
  >
    <div class="ctv-body">
      <el-date-picker
        v-model="innerValue"
        :type="type"
        :placeholder="placeholder"
        :start-placeholder="startPlaceholder"
        :end-placeholder="endPlaceholder"
        :format="activeFormat"
        :value-format="activeValueFormat"
        :disabled="disabled"
        :readonly="readonly"
        @change="handleChange"
        @blur="handleBlur"
        style="width: 100%"
        v-bind="$attrs"
      />
      <div v-if="hasError" class="ctv-error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: [String, Date, Array],
  title: String,
  type: { 
    type: String, 
    default: 'date',
    validator: (value) => ['date', 'month', 'year', 'daterange', 'monthrange', 'yearrange'].includes(value)
  },
  placeholder: String,
  startPlaceholder: String,
  endPlaceholder: String,
  disabled: Boolean,
  readonly: Boolean,
  format: String, // If not provided, computed based on type
  valueFormat: String, // If not provided, computed based on type
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  required: Boolean,
  field: String
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change']);

// Default formats based on type
const defaultDisplayFormat = computed(() => {
  if (props.type.includes('month')) return 'YYYY-MM';
  if (props.type.includes('year')) return 'YYYY';
  return 'YYYY-MM-DD';
});

const defaultValueFormat = computed(() => {
  if (props.type.includes('month')) return 'YYYYMM';
  if (props.type.includes('year')) return 'YYYY';
  return 'YYYYMMDD';
});

const activeFormat = computed(() => props.format || defaultDisplayFormat.value);
const activeValueFormat = computed(() => props.valueFormat || defaultValueFormat.value);

// Use form field composable
const { innerValue: formValue, onFormFieldBlur } = useFormField(props, emit);

// Proxy innerValue to handle range types vs single value
const innerValue = computed({
  get: () => formValue.value,
  set: (val) => {
    // null 값(선택 해제 시)은 빈 문자열로 변환하여 처리
    formValue.value = val === null ? '' : val;
  }
});

const errorMessage = ref('');
const hasError = computed(() => !!errorMessage.value);

const wrapperStyle = computed(() => ({
    width: '100%',
}));

const handleChange = (val) => {
  emit('change', val);
};

const handleBlur = () => {
  // 그리드 동기화를 위한 공통 blur 이벤트 발생
  onFormFieldBlur();
};

</script>

<style scoped>
:deep(.el-date-editor) {
    width: 100%;
    box-sizing: border-box;
}
:deep(.el-input__wrapper) {
    box-sizing: border-box;
    width: 100%;
}

/* 필수값 표시 */
.ctv-date-wrapper.is-required :deep(.el-input__wrapper),
.ctv-date-wrapper.is-required :deep(.el-range-editor.el-input__wrapper) {
    background-color: #fefce8 !important; /* light yellow */
}
</style>
