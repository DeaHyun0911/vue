<template>
  <div class="ctv-query-filter">
    <div class="filter-container">
      <!-- 필터 필드 영역 -->
      <ctv-form 
        class="filter-form" 
        :columns="responsiveColumns" 
        :label-position="mergedSetting.labelPosition"
        :model="fieldValues"
        :rules="mergedSetting.rules"
        :validate-on-rule-change="false"
        ref="formRef"
        :style="formStyle"
      >
        <ctv-form-item
          v-for="(field, index) in normalizedFields"
          :key="index"
          :label="field.props.title"
          :prop="field.props?.prop || (Array.isArray(field.field) ? field.field[0] : field.field)"
          :rules="field.props?.rules"
          :style="getFieldStyle(field)"
        >
          <component
            v-if="field.component !== 'ctv-empty'"
            :is="field.component"
            v-bind="field.props"
            :title="undefined" 
            :model-value="getModelValue(field)"
            :parent-value="field.parent ? fieldValues[field.parent] : undefined"
            @update:model-value="handleUpdate(field, $event)"
            @keyup.enter="handleQuery"
          >
            <!-- 동적 슬롯 렌더링 (Mixed Input 지원) -->
            <template v-for="(slotData, slotName) in field.slots" :key="slotName" v-slot:[slotName]>
                <!-- 1. 컴포넌트 렌더링 -->
                <component 
                  v-if="slotData.component" 
                  :is="slotData.component"
                  v-bind="slotData.props"
                  :model-value="slotData.field ? getModelValue(slotData) : undefined"
                  :parent-value="slotData.parent ? fieldValues[slotData.parent] : undefined"
                  @update:model-value="slotData.field ? handleUpdate(slotData, $event) : undefined"
                  v-on="slotData.events || {}"
                  :style="slotData.style"
                >
                    {{ slotData.content }}
                </component>
                <!-- 2. 단순 컨텐츠 -->
                <span v-else-if="slotData.content" v-html="slotData.content"></span>
            </template>
          </component>
          <div v-else class="ctv-empty-space" :style="field.style || {}"></div>
        </ctv-form-item>
      </ctv-form>
      
      <!-- 버튼 영역 -->
      <div v-if="showButtons" class="button-group">
        <ctv-button 
            v-if="resolvedButtons.query.visible" 
            type="primary" 
            icon="Search" 
            :disabled="resolvedButtons.query.disabled"
            @click="handleQuery"
        >
          {{ buttonLabels.query }}
        </ctv-button>
        <ctv-button 
            v-if="resolvedButtons.reset.visible"
            icon="Refresh" 
            :disabled="resolvedButtons.reset.disabled"
            @click="handleReset"
        >
          {{ buttonLabels.reset }}
        </ctv-button>
        
        <!-- 사용자 정의 버튼 slot -->
        <slot name="buttons"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, nextTick, ref, onUnmounted } from 'vue';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  /**
   * 한 행당 전체 칸 수
   */
  columns: {
    type: Number,
    default: 12
  },
  /**
   * 필드 배열
   * field: { component, field, span, props, modelValue }
   */
  fields: {
    type: Array,
    default: () => []
  },
  /**
   * 타겟 컴포넌트 ID (단일)
   */
  target: {
    type: String,
    default: null
  },
  /**
   * 타겟 컴포넌트 그룹 ID (다수)
   */
  group: {
    type: String,
    default: null
  },
  /**
   * 버튼 표시 여부
   */
  showButtons: {
    type: Boolean,
    default: true
  },
  /**
   * 버튼 라벨 커스터마이징
   */
  buttonLabels: {
    type: Object,
    default: () => ({
      query: '조회',
      reset: '초기화'
    })
  },
  /**
   * 버튼 제어 (보임/숨김, 비활성화)
   * 예: { query: { visible: true, disabled: false }, reset: { visible: false } }
   */
  buttons: {
    type: Object,
    default: () => ({})
  },
  /**
   * 컴포넌트 ID (레지스트리 등록용)
   */
  id: {
    type: String,
    default: null
  },
  labelWidth: {
    type: [String, Number],
    default: 'auto'
  },
  labelPosition: {
    type: String,
    default: 'right'
  },
  labelPosition: {
    type: String,
    default: 'right'
  },
  rules: {
    type: Object,
    default: () => ({})
  },
  setting: { type: Object, default: null }
});

const mergedSetting = computed(() => {
    const settings = props.setting || {};
    return {
        columns: props.columns !== 12 ? props.columns : (settings.columns || 12),
        fields: (props.fields && props.fields.length) ? props.fields : (settings.fields || []),
        target: props.target || settings.target,
        group: props.group || settings.group,
        showButtons: props.showButtons !== true ? props.showButtons : (settings.showButtons !== undefined ? settings.showButtons : true),
        buttonLabels: props.buttonLabels && Object.keys(props.buttonLabels).length !== 2 ? props.buttonLabels : (settings.buttonLabels || { query: '조회', reset: '초기화' }),
        buttons: props.buttons && Object.keys(props.buttons).length ? props.buttons : (settings.buttons || {}),
        id: props.id || settings.id,
        labelWidth: props.labelWidth !== 'auto' ? props.labelWidth : (settings.labelWidth || 'auto'),
        labelWidth: props.labelWidth !== 'auto' ? props.labelWidth : (settings.labelWidth || 'auto'),
        labelPosition: props.labelPosition !== 'right' ? props.labelPosition : (settings.labelPosition || 'right'),
        rules: props.rules && Object.keys(props.rules).length ? props.rules : (settings.rules || {})
    };
});

const formRef = ref(null);
const validate = (...args) => formRef.value?.validate(...args);
const clearValidate = (...args) => formRef.value?.clearValidate(...args);

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);

const updateWidth = () => {
    windowWidth.value = window.innerWidth;
};

onMounted(() => {
    window.addEventListener('resize', updateWidth);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateWidth);
});

const responsiveColumns = computed(() => {
    const base = mergedSetting.value.columns;
    if (windowWidth.value <= 768) return 1;
    if (windowWidth.value <= 1400) return Math.max(1, Math.ceil(base / 2));
    return base;
});

const emit = defineEmits(['update:field', 'query', 'reset']);

/**
 * 정규화된 필드 목록 (기본값 적용)
 */
const normalizedFields = computed(() => {
  const fields = mergedSetting.value.fields || [];
  const rules = mergedSetting.value.rules || {};
  
  return fields.map(field => {
    // 깊은 복사 또는 props 병합
    const defaultProps = {
      labelAlign: 'right' // 기본값: 오른쪽 정렬
    };
    
    // Evaluate dynamic props based on current state
    let extraProps = {};
    if (typeof field.condition === 'function') {
        extraProps = field.condition(fieldValues);
    }
    
    // Check if field is required based on rules
    let isRequired = false;
    
    // 1. Check prop.required
    if (field.props?.required) {
        isRequired = true;
    } 
    // 2. Check rules (global or local)
    else {
        // Handle array fields (check if any field in the group is required)
        const fieldNames = Array.isArray(field.field) ? field.field : [field.field];
        
        for (const name of fieldNames) {
            // Global rules
            if (rules[name]) {
                const ruleList = Array.isArray(rules[name]) ? rules[name] : [rules[name]];
                if (ruleList.some(r => r.required)) {
                    isRequired = true;
                    break;
                }
            }
            // Local rules (prop.rules)
            if (field.props?.rules) {
                 const ruleList = Array.isArray(field.props.rules) ? field.props.rules : [field.props.rules];
                 if (ruleList.some(r => r.required)) {
                     isRequired = true;
                     break;
                 }
            }
        }
    }
    
    return {
      ...field,
      props: {
        ...defaultProps,
        ...(field.props || {}),
        ...extraProps,
        required: isRequired
      }
    };
  });
});

/**
 * 버튼 설정 정규화
 */
const resolvedButtons = computed(() => {
    const defaults = {
        query: { visible: true, disabled: false },
        reset: { visible: true, disabled: false }
    };

    const userConfig = mergedSetting.value.buttons || {};

    return {
        query: { ...defaults.query, ...(userConfig.query || {}) },
        reset: { ...defaults.reset, ...(userConfig.reset || {}) }
    };
});

/**
 * 내부 필드 값 관리 (자체 상태 관리)
 */
const fieldValues = reactive({});

/**
 * 필드의 기본값 결정
 */
const getDefaultValue = (field) => {
  // props에 defaultValue가 있으면 사용
  if (field.props?.defaultValue !== undefined) {
    return field.props.defaultValue;
  }
  // 컴포넌트 타입에 따른 기본값
  if (field.component === 'ctv-check' || field.component === 'ctv-switch') {
    return false;
  }
  // 배열 타입 (multi-select 등)
  if (field.props?.multiple) {
    return [];
  }
  return '';
};

/**
 * 필드 값 초기화
 */
 const initializeFieldValues = () => {
  const fields = mergedSetting.value.fields || [];
  
  const initField = (item) => {
      // 1. 메인 필드 초기화
      if (item.field) {
          if (Array.isArray(item.field)) {
              const defaultValues = item.props?.defaultValue;
              item.field.forEach((key, index) => {
                  if (!(key in fieldValues)) {
                      if (Array.isArray(defaultValues) && defaultValues[index] !== undefined) {
                          fieldValues[key] = defaultValues[index];
                      } else {
                          fieldValues[key] = '';
                      }
                  }
              });
          } else if (!(item.field in fieldValues)) {
              fieldValues[item.field] = getDefaultValue(item);
          }
      }

      // 2. 슬롯 내부 필드 재귀적 초기화
      if (item.slots) {
          Object.values(item.slots).forEach(slotItem => {
              if (slotItem) initField(slotItem);
          });
      }
  };

  fields.forEach(field => {
      initField(field);
  });
};

/**
 * 외부에서 현재 필드 값들을 가져가는 메서드
 */
const getFieldValues = () => {
  return { ...fieldValues };
};

/**
 * 폼 스타일 계산
 */
const formStyle = computed(() => ({
  flex: 1,
  width: '100%',
  alignItems: 'center' // Align items vertically in center
}));

/**
 * 각 필드의 스타일 계산
 */
const getFieldStyle = (field) => {
  const span = field.span || 1;
  return {
    gridColumn: `span ${span}`
  };
};

/**
 * 필드의 modelValue 가져오기
 */
const getModelValue = (field) => {
  // 외부에서 modelValue를 제공한 경우 우선 사용 (하위 호환성)
  if (field.modelValue !== undefined) {
    // computed ref인 경우 .value 접근
    if (field.modelValue && typeof field.modelValue === 'object' && 'value' in field.modelValue) {
      return field.modelValue.value;
    }
    return field.modelValue;
  }
  
  // modelValue가 없으면 내부 상태 사용
  // 배열 필드 처리
  if (Array.isArray(field.field)) {
      return field.field.map(key => fieldValues[key]);
  }
  return fieldValues[field.field];
};

/**
 * 필드 값 업데이트 처리
 */
const handleUpdate = (field, value) => {
  // 내부 상태 업데이트
  if (Array.isArray(field.field)) {
      if (Array.isArray(value)) {
          field.field.forEach((key, index) => {
              fieldValues[key] = value[index];
          });
      } else {
          // 값이 null이거나 비어있을 때 초기화
          field.field.forEach(key => {
              fieldValues[key] = '';
          });
      }
  } else {
      fieldValues[field.field] = value;
      // 외부로 이벤트 발생 (하위 호환성)
      emit('update:field', field.field, value);
  }
  
  // autoLoad 옵션이 있는 경우 자동 조회 (주로 ctv-select 등에서 사용)
  if (field.autoLoad) {
      nextTick(() => {
          handleQuery();
      });
  }
};

/**
 * 조회 버튼 클릭 처리
 */
const handleQuery = () => {
  // target이 지정된 경우
  if (mergedSetting.value.target) {
    let targetComponent = componentRegistry.get(mergedSetting.value.target);
    if (!targetComponent) {
      targetComponent = componentRegistry.getActive(mergedSetting.value.target);
    }
    if (targetComponent?.query) {
      targetComponent.query();
    }
  }
  
  // group이 지정된 경우 (활성 컴포넌트만 동작)
  if (mergedSetting.value.group) {
    const activeComp = componentRegistry.getActive(mergedSetting.value.group);
    if (activeComp && activeComp.query) {
        activeComp.query();
    }
  }
  
  // 이벤트 발생
  emit('query');
};

/**
 * 초기화 버튼 클릭 처리
 */
const handleReset = () => {
  // 모든 필드를 초기값으로 리셋
  const fields = mergedSetting.value.fields || [];
  fields.forEach(field => {
    const defaultValue = getDefaultValue(field);
    
    // 내부 상태 업데이트
    fieldValues[field.field] = defaultValue;
    
    // 외부로 이벤트 발생 (하위 호환성)
    emit('update:field', field.field, defaultValue);
  });

  // target이 지정된 경우
  if (mergedSetting.value.target) {
    let targetComponent = componentRegistry.get(mergedSetting.value.target);
    if (!targetComponent) {
      targetComponent = componentRegistry.getActive(mergedSetting.value.target);
    }
    if (targetComponent?.reset) {
      targetComponent.reset();
    }
  }
  
  // group이 지정된 경우
  if (mergedSetting.value.group) {
    const activeComp = componentRegistry.getActive(mergedSetting.value.group);
    if (activeComp && activeComp.reset) {
        activeComp.reset();
    }
  }
  
  // 이벤트 발생
  emit('reset');
};

/**
 * 필드 변경 감지 및 초기화
 */
watch(() => mergedSetting.value.fields, () => {
  initializeFieldValues();
}, { immediate: true, deep: true });

onMounted(() => {
  if (mergedSetting.value.id) {
    componentRegistry.register(mergedSetting.value.id, {
      group: mergedSetting.value.group,
      getFieldValues,
      reset: handleReset,
      validate
    });
  }
  
  // 마운트 시 초기 검증 상태 제거
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
    }
  });
});

/**
 * 외부에서 접근 가능한 메서드 노출
 */
defineExpose({
  getFieldValues,
  reset: handleReset,
  validate,
  clearValidate
});
</script>

<style scoped>
.ctv-query-filter {
  width: 100%;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  box-sizing: border-box;
}

.filter-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  width: 100%;
}



.button-group {
  display: flex;
  flex-shrink: 0;
}

/* 반응형 처리 */
@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  

  
  .button-group {
    justify-content: flex-end;
    margin-bottom: 0;
  }
}

.ctv-empty-space {
  width: 100%;
  height: 100%;
}
</style>
