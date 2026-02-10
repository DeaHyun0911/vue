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
      :style="{ width: labelWidth + 'px' }"
    >
      {{ title }}
    </label>
    
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
        @focus="$emit('focus', $event)"
        @blur="onBlur"
        @change="$emit('change', $event)"
        @input="$emit('input', $event)"
        v-bind="$attrs"
      >
        <template v-if="$slots.prepend" #prepend>
            <slot name="prepend"></slot>
        </template>
        <template v-if="$slots.append" #append>
            <slot name="append"></slot>
        </template>
      </el-input>
      <div v-if="hasError" class="ctv-error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

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
  validate: [Object, String, Function] // validation rule
});

const emit = defineEmits(['update:modelValue', 'change', 'input', 'blur', 'focus']);

const innerValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

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
    // Add more validation logic if needed (regex, function via props.validate)
    errorMessage.value = '';
    return true;
};

const wrapperStyle = computed(() => ({
    display: 'flex',
    alignItems: 'center',
}));

const labelClasses = computed(() => ({
    'is-required': props.required,
    [`align-${props.labelAlign}`]: true
}));

defineExpose({ validate });
</script>

<style scoped>
.ctv-wrapper {
    width: 100%;
}
.ctv-label {
    margin-right: 10px;
    font-size: 13px;
    color: #606266;
    flex-shrink: 0;
    line-height: 32px; /* align with input height */
}
.ctv-label.align-left { text-align: left; }
.ctv-label.align-center { text-align: center; }
.ctv-label.align-right { text-align: right; }
.ctv-label.is-required::before {
    content: '*';
    color: #f56c6c;
    margin-right: 4px;
}
.ctv-body {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
}
.ctv-error-msg {
    color: #f56c6c;
    font-size: 12px;
    margin-top: 2px;
    position: absolute;
    top: 100%;
    left: 0;
}
:deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #dcdfe6 inset;
}
:deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #409eff inset;
}
</style>
