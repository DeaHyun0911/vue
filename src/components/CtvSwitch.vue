<template>
  <div class="ctv-switch-wrapper" :style="wrapperStyle">

    <el-switch
      v-model="innerValue"
      :active-text="activeText"
      :inactive-text="inactiveText"
      :active-value="activeValue"
      :inactive-value="inactiveValue"
      :disabled="disabled"
      @change="handleChange"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [Boolean, String, Number],
  title: String,
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  activeText: String,
  inactiveText: String,
  activeValue: { type: [Boolean, String, Number], default: true },
  inactiveValue: { type: [Boolean, String, Number], default: false },
  disabled: Boolean,
  field: String // New prop for implicit binding
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);

const wrapperStyle = computed(() => ({
    // display: 'flex', // No longer needed
    // alignItems: 'center',
    marginBottom: '5px'
}));

const handleChange = (val) => {
  emit('change', val);
  // 그리드 동기화를 위한 공통 이벤트 발생 (스위치는 change 즉시 동기화)
  onFormFieldBlur();
};

</script>

<style scoped>
</style>
