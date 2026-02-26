<template>
  <div class="ctv-form-wrapper" :style="{ maxWidth: formatSize(maxWidth) }">
    <!-- Optional Title -->
    <h3 v-if="title" class="ctv-form-title">{{ title }}</h3>
    
    <el-form
      ref="formRef"
      v-bind="$attrs"
      :model="model"
      class="ctv-form"
      :class="[`columns-${columns}`]"
      :label-width="labelWidth"
      :label-position="labelPosition"
      :rules="processedRules"
      :style="gridStyle"
    >
      <!-- 선언적 필드 렌더링 (CtvQueryFilter 스타일) -->
      <template v-for="(fieldDef, idx) in resolvedFields" :key="fieldDef.field || idx">
        <ctv-form-item 
          :label="fieldDef.title || fieldDef.label" 
          :prop="fieldDef.field"
          :span="fieldDef.span"
          v-if="fieldDef.visible !== false"
          :style="getFieldStyle(fieldDef)"
        >
          <!-- ctv-empty: 빈 공간 (레이아웃 정렬용) -->
          <div v-if="fieldDef.component === 'ctv-empty'" class="ctv-empty-space" :style="fieldDef.style || {}"></div>
          <component
            v-else
            :is="fieldDef.component" 
            v-bind="fieldDef"
            :field="fieldDef.field"
            v-on="fieldDef.events || {}"
          >
            <!-- 폼 내부 슬롯 지원 (Mixed Input 등) -->
            <template v-for="(slotData, slotName) in fieldDef.slots" :key="slotName" v-slot:[slotName]>
                <!-- 1. 컴포넌트 렌더링 -->
                <component 
                    v-if="slotData.component" 
                    :is="slotData.component"
                    v-bind="slotData"
                >
                    {{ slotData.content }}
                </component>
                <!-- 2. 단순 컨텐츠 -->
                <span v-else-if="slotData.content" v-html="slotData.content"></span>
            </template>
          </component>
        </ctv-form-item>
      </template>

      <!-- 직접 작성하는 Slot -->
      <slot />
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, isRef, onMounted, onUnmounted, provide, toRef, reactive, watch, nextTick } from 'vue';

const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  columns: {
    type: [Number, String],
    default: 1
  },
  labelWidth: {
    type: [String, Number],
    default: '120px' 
  },
  labelPosition: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right', 'top'].includes(value)
  },
  rules: {
    type: Object,
    default: () => ({})
  },
  /**
   * 선언적 필드 설정
   * Array: [{ component: 'ctv-input', field: 'NAME', title: '성명' }, ...]
   * Object (필드 중심): { NAME: { component: 'ctv-input', title: '성명' }, ... }
   */
  fields: {
    type: [Array, Object],
    default: () => []
  },
  maxWidth: {
    type: [String, Number],
    default: 'none'
  },
  gap: {
    type: String,
    default: '8px 20px'
  }
});

// 너비 단위 처리 함수 (숫자일 경우 px 추가)
const formatSize = (val) => {
  if (!val || val === 'none') return 'none';
  return isNaN(val) ? val : `${val}px`;
};

const resolvedFields = computed(() => {
  // ComputedRef로 전달된 경우 (reactive 객체 내부에서 computed로 감싼 fields) 언래핑
  const rawFields = isRef(props.fields) ? props.fields.value : props.fields;

  if (Array.isArray(rawFields)) {
    return rawFields.map(f => {
      // 룰셋에서 해당 필드(f.field)에 required: true 가 있는지 확인
      let isReq = f.required === true;
      if (!isReq && f.field && props.rules && props.rules[f.field]) {
        const fieldRules = Array.isArray(props.rules[f.field]) ? props.rules[f.field] : [props.rules[f.field]];
        isReq = fieldRules.some(r => r.required === true);
      }
      return { ...f, required: isReq };
    });
  }
  
  // Object 형식인 경우 Array로 변환 (Key를 field로 사용)
  if (rawFields && typeof rawFields === 'object') {
    return Object.entries(rawFields).map(([key, value]) => {
      let isReq = value.required === true;
      if (!isReq && props.rules && props.rules[key]) {
        const fieldRules = Array.isArray(props.rules[key]) ? props.rules[key] : [props.rules[key]];
        isReq = fieldRules.some(r => r.required === true);
      }
      return {
        field: key,
        ...value,
        required: isReq
      };
    });
  }
  
  return [];
});

const processedRules = computed(() => {
  if (!props.rules) return {};
  const newRules = {};
  for (const key in props.rules) {
    const fieldRules = props.rules[key];
    if (Array.isArray(fieldRules)) {
      newRules[key] = fieldRules.map(r => {
        if (r.required && !r.message) {
          return { ...r, message: '필수 입력 항목입니다.' };
        }
        return r;
      });
    } else if (fieldRules && typeof fieldRules === 'object') {
      if (fieldRules.required && !fieldRules.message) {
        newRules[key] = { ...fieldRules, message: '필수 입력 항목입니다.' };
      } else {
        newRules[key] = fieldRules;
      }
    }
  }
  return newRules;
});

watch(resolvedFields, (fields) => {
  if (props.model) {
    const initializeFields = (def) => {
      Object.keys(def).forEach(k => {
        // field 속성, 또는 addrField 등 Field 패턴이 들어간 속성 자동 초기화
        if (k === 'field' || k.endsWith('Field')) {
          const fieldName = def[k];
          if (typeof fieldName === 'string' && props.model[fieldName] === undefined) {
            props.model[fieldName] = '';
          }
        }
      });
      // 슬롯 내 삽입된 컴포넌트의 field 들도 자동 초기화
      if (def.slots) {
        Object.values(def.slots).forEach(slotItem => {
          if (slotItem && typeof slotItem === 'object') {
            initializeFields(slotItem);
          }
        });
      }
    };
    
    fields.forEach(f => initializeFields(f));
  }
}, { immediate: true, deep: true });

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
const handleResize = () => { windowWidth.value = window.innerWidth; };

const handleGridFocusDataChanged = (e) => {
  if (e.detail?.focusData === props.model && formRef.value) {
    nextTick(() => {
      formRef.value.clearValidate();
    });
  }
};

onMounted(() => { 
  window.addEventListener('resize', handleResize); 
  window.addEventListener('ctv-grid-focus-data-changed', handleGridFocusDataChanged);
});
onUnmounted(() => { 
  window.removeEventListener('resize', handleResize); 
  window.removeEventListener('ctv-grid-focus-data-changed', handleGridFocusDataChanged);
});

/**
 * 화면 너비에 따른 실제 컬럼 수 계산
 */
const currentColumns = computed(() => {
  const maxCols = Number(props.columns) || 1;
  const width = windowWidth.value;
  
  if (width <= 768) return 1;
  if (width <= 1600) return Math.min(2, maxCols);
  if (width <= 1920) return Math.min(3, maxCols);
  if (width <= 2560) return Math.min(4, maxCols);
  return maxCols;
});

provide('formModel', toRef(props, 'model'));

// 폼 포커스 상태 관리 (그리드 동기화 제어용)
const formFocusState = reactive({
  hasFocus: false,
  setFocus: (focused) => {
    formFocusState.hasFocus = focused;
    // 전역 이벤트로 폼 포커스 상태 브로드캐스트
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ctv-form-focus', {
        detail: { focused, formModel: props.model }
      }));
    }
  }
});
provide('formFocusState', formFocusState);

const formRef = ref(null);

// Grid Style for CSS Grid Layout
const gridStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentColumns.value}, 1fr)`,
    gap: props.gap, 
  };
});

// Handle label-width for top position
const labelWidth = computed(() => {
  if (props.labelPosition === 'top') return 'auto';
  return props.labelWidth;
});

/**
 * 각 필드의 스타일 계산 (그리드 레이아웃 지원)
 */
const getFieldStyle = (field) => {
  const span = Math.min(field.span || 1, currentColumns.value);
  return {
    gridColumn: `span ${span}`
  };
};

// Expose Element Plus Form methods transparently
const validate = (...args) => formRef.value?.validate(...args);
const validateField = (...args) => formRef.value?.validateField(...args);
const resetFields = (...args) => formRef.value?.resetFields(...args);
const scrollToField = (...args) => formRef.value?.scrollToField(...args);
const clearValidate = (...args) => formRef.value?.clearValidate(...args);

defineExpose({
  formRef,
  validate,
  validateField,
  resetFields,
  scrollToField,
  clearValidate
});
</script>

<style scoped>
.ctv-form-wrapper {
  width: 100%;
}

.ctv-form-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  margin-top: 0;
  color: #333;
}

.ctv-form {
  width: 100%;
}

/* Responsive adjustments if needed, though grid handles most */
@media (max-width: 768px) {
  .ctv-form {
    grid-template-columns: 1fr !important;
  }
}

.ctv-empty-space {
  width: 100%;
  height: 100%;
}
</style>
