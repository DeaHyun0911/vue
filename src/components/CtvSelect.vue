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
      <el-select
        ref="elSelect"
        v-model="innerValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :multiple="multiple"
        popper-class="clean-dropdown"
        @focus="$emit('focus', $event)"
        @blur="onBlur"
        @change="$emit('change', $event)"
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
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Array],
  title: String,
  options: { type: Array, default: () => [] },
  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  multiple: Boolean,
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  required: Boolean
});

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

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
    if (props.required && (!innerValue.value || (Array.isArray(innerValue.value) && innerValue.value.length === 0))) {
        errorMessage.value = '필수 선택 항목입니다.';
        return false;
    }
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
/* Same styles as CtvInput for consistency */
.ctv-wrapper { width: 100%; }
.ctv-label {
    margin-right: 10px;
    font-size: 13px;
    color: #606266;
    flex-shrink: 0;
    line-height: 32px;
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
