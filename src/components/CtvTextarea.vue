<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <div class="ctv-body" :style="{ width: '100%' }">
      <el-input
        ref="elInput"
        v-model="innerValue"
        type="textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :minlength="minlength"
        :rows="rows"
        :autosize="autosize"
        :resize="resize"
        :input-style="{ minHeight: minHeight }"
        @focus="onFocus"
        @blur="onBlur"
        @change="$emit('change', $event)"
        @input="$emit('input', $event)"
        v-bind="$attrs"
      >
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
  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  maxlength: [String, Number],
  minlength: [String, Number],
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  required: Boolean,
  rows: { type: [Number, String], default: 2 },
  autosize: { type: [Boolean, Object], default: false },
  labelPosition: { type: String, default: 'left' }, // left | top
  resize: { type: String, default: 'none' },
  minHeight: { type: [String, Number], default: '' },
  field: String // New prop for implicit binding
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change', 'input', 'blur', 'focus']);

const { innerValue } = useFormField(props, emit);

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
};

const validate = () => {
    if (props.required && (!innerValue.value || String(innerValue.value).trim() === '')) {
        errorMessage.value = '필수 입력 항목입니다.';
        return false;
    }
    errorMessage.value = '';
    return true;
};

const wrapperStyle = computed(() => ({
    width: '100%'
}));

defineExpose({ validate });
</script>

<style scoped>
.ctv-body {
  width: 100%;
}
.ctv-error-msg {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 2px;
}
:deep(.el-textarea__inner) {
    box-shadow: 0 0 0 1px #dcdfe6 inset;
}
:deep(.el-textarea__inner:focus) {
    box-shadow: 0 0 0 1px #409eff inset;
}
</style>
