<template>
  <div 
    class="ctv-date-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <label 
      v-if="title" 
      class="ctv-label" 
      :class="labelClasses"
      :style="{ width: labelWidth + 'px' }"
    >
      {{ title }}
    </label>
    
    <div class="ctv-body">
      <el-date-picker
        v-model="innerValue"
        type="date"
        :placeholder="placeholder"
        :format="format"
        :value-format="valueFormat"
        :disabled="disabled"
        :readonly="readonly"
        @change="$emit('change', $event)"
        v-bind="$attrs"
      />
      <div v-if="hasError" class="ctv-error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: [String, Date],
  title: String,
  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  format: { type: String, default: 'YYYY-MM-DD' },
  valueFormat: { type: String, default: 'YYYY-MM-DD' },
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  required: Boolean
});

const emit = defineEmits(['update:modelValue', 'change']);

const innerValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const errorMessage = ref('');
const hasError = computed(() => !!errorMessage.value);

const wrapperStyle = computed(() => ({
    display: 'flex',
    alignItems: 'center',
}));

const labelClasses = computed(() => ({
    'is-required': props.required,
    [`align-${props.labelAlign}`]: true
}));
</script>

<style scoped>
</style>
