<template>
  <div 
    class="ctv-wrapper" 
    :style="wrapperStyle"
    :class="{ 'ctv-error': hasError, 'is-required': required }"
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
        @change="handleChange"
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
                v-for="item in filteredOptions"
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
  field: String, // New prop for implicit binding
  parentValue: [String, Number], // 부모 값
  linkKey: { type: String, default: 'pcode' }, // 연결 키 (기본값: pcode)
});

import { useFormField } from '../composables/useFormField';

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);

// 필터링된 옵션 목록
const filteredOptions = computed(() => {
    // 1. parentValue가 undefined이면 일반 모드 (필터링 안 함)
    // CtvQueryFilter에서 parent 설정이 없으면 undefined를 전달함
    if (props.parentValue === undefined) {
        return props.options;
    }

    // 2. 부모 값이 있는데 비어있는 경우(null, '') -> 모든 옵션 반환
    if (!props.parentValue) {
        return props.options;
    }

    // 3. 필터링 수행 (타입 변환 고려하여 동등 비교 == 사용)
    // linkKey는 기본값 'pcode'가 설정되어 있음
    return props.options.filter(opt => opt[props.linkKey] == props.parentValue);
});

// 부모 값 변경 시 자식 값 초기화 로직
watch(() => props.parentValue, (newVal) => {
    if(!props.linkKey) return;

    // 만약 현재 선택된 값이 새로운 필터링 목록에 없다면 초기화
    // (값이 비어있지 않을 때만 체크)
    if (innerValue.value) {
        const isValid = filteredOptions.value.some(opt => opt.value == innerValue.value);
        if (!isValid) {
            innerValue.value = ''; // 초기화
            // emit('change', ''); // useFormField 내부에서 watch로 emit 하므로 중복 방지? 
            // innerValue 변경시 useFormField가 update:modelValue는 emit함. change는 별도.
            // 명시적으로 change 이벤트 발생이 필요할 수 있음.
            emit('change', '');
            onFormFieldBlur();
        }
    }
});

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

const handleChange = (val) => {
  emit('change', val);
  // 그리드 동기화를 위한 공통 이벤트 발생 (셀렉트는 change 즉시 동기화)
  onFormFieldBlur();
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
    border-radius: 2px !important; /* 둥근 모서리 줄이기 */
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1) !important;
}

/* 필수값 표시 */
.ctv-wrapper.is-required :deep(.el-input__wrapper) {
    background-color: #fefce8 !important; /* light yellow */
}
</style>
