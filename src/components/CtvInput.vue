<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError, 'is-required': required }"
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
  field: String, // New prop for implicit binding
  prependRatio: { type: [String, Number], default: null },
  appendRatio: { type: [String, Number], default: null }
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

const wrapperStyle = computed(() => {
    const style = { width: '100%' };
    if (props.prependRatio) {
        const val = props.prependRatio;
        style['--ctv-prepend-width'] = !isNaN(Number(val)) ? `${val}%` : val;
    }
    if (props.appendRatio) {
        const val = props.appendRatio;
        style['--ctv-append-width'] = !isNaN(Number(val)) ? `${val}%` : val;
    }
    return style;
});



defineExpose({ validate });
</script>

<style scoped>
:deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #dcdfe6 inset;
}
:deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #409eff inset;
}

/* Input Group 스타일 개선 for Mixed Input */
:deep(.el-input-group__prepend),
:deep(.el-input-group__append) {
    padding: 0;
    background-color: #fff; /* 배경색 일치 */
}

/* 슬롯 내부 CtvInput wrapper 초기화 */
:deep(.el-input-group__prepend .ctv-wrapper),
:deep(.el-input-group__append .ctv-wrapper) {
    margin: 0;
    width: 100%; /* 비율을 따르도록 100% 로 변경 */
    min-width: 0;
}

/* 슬롯 내부 input - 테두리 및 그림자 제거하여 자연스럽게 연결 */
:deep(.el-input-group__prepend .el-input__wrapper),
:deep(.el-input-group__append .el-input__wrapper) {
    background-color: transparent !important;
    border-radius: 0;
    margin-right: -1px;
}

/* 구분선 추가 및 비율 적용 */
:deep(.el-input-group__prepend) {
    border-right: 1px solid #dcdfe6;
    width: var(--ctv-prepend-width, auto);
}
:deep(.el-input-group__append) {
    border-left: 1px solid #dcdfe6;
    width: var(--ctv-append-width, auto);
}

/* 필수값 표시 */
.ctv-wrapper.is-required :deep(.el-input__wrapper) {
    background-color: #fefce8 !important; /* light yellow (tailwind yellow-50) */
}
</style>
