<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError }"
  >
    <div class="ctv-body">
      <el-select
        ref="elSelect"
        v-model="innerValue"
        :placeholder="placeholder"
        :empty-values="[null, undefined]"
        :value-on-clear="''"
        clearable
        :disabled="disabled"
        :readonly="readonly"
        :multiple="multiple"
        popper-class="clean-dropdown"
        @focus="onFocus"
        @blur="onBlur"
        @change="$emit('change', $event)"
        style="width: 100%; box-sizing: border-box;"
        v-bind="$attrs"
      >
        <template v-if="$slots.prepend" #prepend>
            <slot name="prepend"></slot>
        </template>
        <!-- Support both inline slot and options prop -->
        <template v-if="$slots.default">
            <slot></slot>
        </template>
        <template v-else-if="options && options.length">
            <el-option
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value"
                :disabled="item.disabled"
            />
        </template>
      </el-select>
      <div v-if="hasError" class="ctv-error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, inject } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Array],
  title: String,
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '선택하세요' },
  disabled: Boolean,
  readonly: Boolean,
  multiple: Boolean,
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  required: Boolean,
  field: String // New prop for implicit binding
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

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
    if (props.required && (!innerValue.value || innerValue.value === "" || (Array.isArray(innerValue.value) && innerValue.value.length === 0))) {
        errorMessage.value = '필수 선택 항목입니다.';
        return false;
    }
    errorMessage.value = '';
    return true;
};

const wrapperStyle = computed(() => ({
    width: '100%',
}));



defineExpose({ validate });
</script>

<style scoped>
/* 1. 화살표(말풍선 꼬리) 숨기기 */
.el-popper__arrow {
    display: none !important;
}

/* 2. 입력창과의 간격 좁히기 */
/* Element Plus는 기본적으로 margin을 주어 화살표 공간을 확보하므로 이를 없앱니다 */
.clean-dropdown.el-popper {
    margin-top: 4px !important; /* 0px로 하면 딱 붙고, 4px 정도가 보기 좋습니다 */
    margin-bottom: 0 !important;
}

/* (선택사항) 드롭다운 그림자나 테두리 스타일을 ERP스럽게 단정하게 변경 */
.clean-dropdown.el-popper {
    border-radius: 2px !important; /* 둥근 모서리 줄이기 */
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1) !important;
}
</style>
