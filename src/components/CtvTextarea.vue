<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <label 
      v-if="title" 
      class="ctv-label" 
      :class="labelClasses"
      :style="labelStyle"
    >
      {{ title }}
    </label>
    
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
        @focus="$emit('focus', $event)"
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
import { computed, ref } from 'vue';

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

const errorMessage = ref('');
const hasError = computed(() => !!errorMessage.value);

const onBlur = (e) => {
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
    display: 'flex',
    flexDirection: props.labelPosition === 'top' ? 'column' : 'row',
    alignItems: props.labelPosition === 'top' ? 'stretch' : 'flex-start',
    width: '100%'
}));

const labelStyle = computed(() => {
    if (props.labelPosition === 'top') {
        return {
            width: '100%',
            textAlign: 'left',
            marginBottom: '5px'
        };
    }
    return {
        width: props.labelWidth + 'px',
        alignSelf: 'flex-start',
        marginTop: '5px'
    };
});

const labelClasses = computed(() => ({
    'is-required': props.required,
    [`align-${props.labelAlign}`]: true
}));

defineExpose({ validate });
</script>

<style scoped>
.ctv-wrapper {
  margin-bottom: 5px;
}
.ctv-label {
  font-weight: bold;
  margin-right: 10px;
  text-align: right;
  font-size: 13px;
  color: #606266;
}
.ctv-label.align-left { text-align: left; }
.ctv-label.align-center { text-align: center; }
.ctv-body {
  flex: 1;
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
