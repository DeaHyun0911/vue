<template>
  <div class="ctv-check-wrapper" :style="wrapperStyle">
    <el-checkbox
      v-model="innerValue"
      :label="label"
      :disabled="disabled"
      :checked="!!modelValue"
      @change="handleChange"
      v-bind="$attrs"
    >
      <slot>{{ label }}</slot>
    </el-checkbox>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [Boolean, String, Number],
  label: String,
  disabled: Boolean,
  field: String
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change']);

const { innerValue: formValue, onFormFieldBlur } = useFormField(props, emit);

// CtvCheck는 boolean 전용이므로 변환 레이어 추가
const innerValue = computed({
  get: () => !!formValue.value,
  set: (val) => {
    formValue.value = val;
  }
});

const wrapperStyle = computed(() => ({
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '10px'
}));

const handleChange = (val) => {
  emit('change', val);
  // 그리드 동기화를 위한 공통 이벤트 발생 (체크박스는 change 즉시 동기화)
  onFormFieldBlur();
};
</script>

<style scoped>
.ctv-check-wrapper {
    /* Style wrapper if needed */
}
</style>
