<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <div class="ctv-body">
      <el-input
        ref="elInput"
        v-model="innerValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :minlength="minlength"
        @focus="onFocus"
        @blur="onBlur"
        @change="$emit('change', $event)"
        @input="$emit('input', $event)"
        style="width: 100%; box-sizing: border-box;"
        v-bind="$attrs"
      >
        <!-- 슬롯 Pass-through -->
        <template #prepend v-if="$slots.prepend">
            <slot name="prepend"></slot>
        </template>
        <template #append v-if="$slots.append">
            <slot name="append"></slot>
        </template>
        <template #prefix v-if="$slots.prefix">
            <slot name="prefix"></slot>
        </template>
        <template #suffix v-if="$slots.suffix">
            <slot name="suffix"></slot>
        </template>
      </el-input>
      <div v-if="hasError" class="ctv-error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  title: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  maxlength: [String, Number],
  minlength: [String, Number],
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 }, // Default label width based on typical ERP layout
  required: Boolean,
  validate: [Object, String, Function], // validation rule
  field: String // New prop for implicit binding
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change', 'input', 'blur', 'focus']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);

// 폼 포커스 상태 관리 (inject from CtvForm)
const formFocusState = inject('formFocusState', null);

const errorMessage = ref('');
const hasError = computed(() => !!errorMessage.value);

const onFocus = (e) => {
  if (formFocusState) {
    formFocusState.setFocus(true);
  }
  emit('focus', e);
};

const onBlur = (e) => {
  if (formFocusState) {
    formFocusState.setFocus(false);
  }
  validate();
  emit('blur', e);

  // 그리드 동기화를 위한 공통 blur 이벤트 발생
  onFormFieldBlur();
};

const validate = () => {
    if (props.required && (!innerValue.value || String(innerValue.value).trim() === '')) {
        errorMessage.value = '필수 입력 항목입니다.';
        return false;
    }
    // Add more validation logic if needed (regex, function via props.validate)
    errorMessage.value = '';
    return true;
};

const wrapperStyle = computed(() => ({
    width: '100%',
}));



defineExpose({ validate });
</script>

<style scoped>
:deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #dcdfe6 inset;
}
:deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #409eff inset;
}
</style>
