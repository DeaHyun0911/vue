<template>
  <div 
    class="ctv-date-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <div class="ctv-body">
      <el-date-picker
        v-model="innerValue"
        :type="type"
        :placeholder="placeholder"
        :start-placeholder="startPlaceholder"
        :end-placeholder="endPlaceholder"
        :format="format"
        :value-format="valueFormat"
        :disabled="disabled"
        :readonly="readonly"
        @change="$emit('change', $event)"
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
const defaultFormat = computed(() => {
  if (props.type.includes('month')) return 'YYYY-MM';
  if (props.type.includes('year')) return 'YYYY';
  return 'YYYY-MM-DD';
});

const activeFormat = computed(() => props.format || defaultFormat.value);
const activeValueFormat = computed(() => props.valueFormat || defaultFormat.value);

// Use form field composable
const { innerValue: formValue } = useFormField(props, emit);

// Proxy innerValue to handle range types vs single value
const innerValue = computed({
  get: () => formValue.value,
  set: (val) => {
    formValue.value = val;
  }
});

const errorMessage = ref('');
const hasError = computed(() => !!errorMessage.value);

const wrapperStyle = computed(() => ({
    width: '100%',
}));


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
</style>
