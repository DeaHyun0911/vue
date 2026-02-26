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
        @input="onInput"
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
import { formItemContextKey } from 'element-plus';

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
  appendRatio: { type: [String, Number], default: null },
  format: { type: String, default: null }, // 'bizno', 'jumin', 'corp', 'phone' or custom like '###-##-#####'
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change', 'input', 'blur', 'focus']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);

// 폼 포커스 상태 관리 (inject from CtvForm)
const formFocusState = inject('formFocusState', null);

const elFormItem = inject(formItemContextKey, null);
const errorMessage = ref('');
const hasError = computed(() => !elFormItem && !!errorMessage.value);

const onFocus = (e) => {
  if (formFocusState) {
    formFocusState.setFocus(true);
  }
  emit('focus', e);
};

const applyFormat = (val) => {
  if (!val || typeof val !== 'string') return val;
  const str = val.replace(/[^0-9]/g, ''); // 숫자만 남기기
  
  // 커스텀 마스크 포맷 (예: '###-##-#####')
  if (props.format && props.format.includes('#')) {
    let result = '';
    let strIndex = 0;
    for (let i = 0; i < props.format.length; i++) {
      if (strIndex >= str.length) break;
      const char = props.format[i];
      if (char === '#') {
        result += str[strIndex++];
      } else {
        result += char;
      }
    }
    return result;
  }

  if (props.format === 'bizno') {
    // ###-##-#####
    if (str.length < 4) return str;
    if (str.length < 6) return `${str.substring(0, 3)}-${str.substring(3)}`;
    return `${str.substring(0, 3)}-${str.substring(3, 5)}-${str.substring(5, 10)}`;
  } else if (props.format === 'jumin' || props.format === 'corp') {
     // ######-#######
    if (str.length < 7) return str;
    return `${str.substring(0, 6)}-${str.substring(6, 13)}`;
  } else if (props.format === 'phone') {
    // 전화번호 포맷 (02-xxxx-xxxx, 010-xxxx-xxxx 등)
    if (str.length < 3) return str;
    if (str.startsWith('02')) {
      if (str.length < 4) return str;
      if (str.length < 6) return `${str.substring(0, 2)}-${str.substring(2)}`;
      if (str.length < 10) return `${str.substring(0, 2)}-${str.substring(2, 5)}-${str.substring(5, 9)}`;
      return `${str.substring(0, 2)}-${str.substring(2, 6)}-${str.substring(6, 10)}`;
    } else {
      if (str.length < 4) return str;
      if (str.length < 7) return `${str.substring(0, 3)}-${str.substring(3)}`;
      if (str.length < 11) return `${str.substring(0, 3)}-${str.substring(3, 6)}-${str.substring(6, 10)}`;
      return `${str.substring(0, 3)}-${str.substring(3, 7)}-${str.substring(7, 11)}`;
    }
  }
  return val;
};

const onInput = (val) => {
  if (props.format) {
    const formatted = applyFormat(val);
    if (val !== formatted) {
      innerValue.value = formatted;
      val = formatted;
    }
  }
  emit('input', val);
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

<style>
.ctv-wrapper .el-input__wrapper:hover {
    z-index: 2;
    box-shadow: 0 0 0 1px #409eff inset;
}

/* Input Group 스타일 개선 for Mixed Input */
.ctv-wrapper .el-input-group__prepend,
.ctv-wrapper .el-input-group__append {
    background-color: #fff; /* 배경색 일치 */
}

.el-input-group__prepend .el-button:not(.el-button--default):not(.is-text),
.el-input-group__append .el-button:not(.el-button--default):not(.is-text) {
    background-color: var(--el-button-bg-color) !important;
    border-color: var(--el-button-border-color) !important;
    color: var(--el-button-text-color) !important;
}

.el-input-group__prepend .el-button:not(.el-button--default):not(.is-text) {
    border-radius: 4px 0px 0px 4px;
}

.el-input-group__append .el-button:not(.el-button--default):not(.is-text) {
    border-radius: 0px 4px 4px 0px;
}

/* Hover 시에도 스타일 유지 */
.el-input-group__prepend .el-button:not(.el-button--default):not(.is-text):hover,
.el-input-group__append .el-button:not(.el-button--default):not(.is-text):hover {
    background-color: var(--el-button-hover-bg-color) !important;
    border-color: var(--el-button-hover-border-color) !important;
    color: var(--el-button-hover-text-color) !important;
}

/* 슬롯에 CtvInput(.ctv-wrapper)이 있을 때만 패딩 0 적용 */
.ctv-wrapper .el-input-group__prepend:has(.ctv-wrapper),
.ctv-wrapper .el-input-group__append:has(.ctv-wrapper) {
    padding: 0;
}

/* 슬롯 내부 CtvInput wrapper 초기화 */
.ctv-wrapper .el-input-group__prepend .ctv-wrapper,
.ctv-wrapper .el-input-group__append .ctv-wrapper {
    margin: 0;
    width: 100%; /* 비율을 따르도록 100% 로 변경 */
    min-width: 0;
}

.ctv-wrapper .el-input-group__prepend .el-input__wrapper {
    border-radius: 4px 0px 0px 4px;
}

.ctv-wrapper .el-input-group__prepend {
    margin-right: -2px;
}

.ctv-wrapper .el-input-group__append {
    margin-left: -2px;
}

.ctv-wrapper .el-input-group__append .el-input__wrapper {
    border-radius: 0px 4px 4px 0px;
}

/* 구분선 추가 및 비율 적용 */
.ctv-wrapper .el-input-group__prepend {
    border-right: 1px solid #dcdfe6;
    width: var(--ctv-prepend-width, auto);
}
.ctv-wrapper .el-input-group__append {
    border-left: 1px solid #dcdfe6;
    width: var(--ctv-append-width, auto);
}

/* 필수값 표시 */
.ctv-wrapper.is-required .el-input__wrapper {
    background-color: #fefce8 !important; /* light yellow (tailwind yellow-50) */
}
</style>
