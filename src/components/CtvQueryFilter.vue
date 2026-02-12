<template>
  <div class="ctv-query-filter">
    <div class="filter-container">
      <!-- 필터 필드 영역 -->
      <div class="filter-grid" :style="gridStyle">
        <div 
          v-for="(field, index) in normalizedFields" 
          :key="index"
          :style="getFieldStyle(field)"
          class="filter-field"
        >
          <component
            :is="field.component"
            v-bind="field.props"
            :model-value="getModelValue(field)"
            @update:model-value="handleUpdate(field, $event)"
            @keyup.enter="handleQuery"
          />
        </div>
      </div>
      
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
import { reactive, computed, watch, onMounted, nextTick } from 'vue';
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
        id: props.id || settings.id
    };
});

const emit = defineEmits(['update:field', 'query', 'reset']);

/**
 * 정규화된 필드 목록 (기본값 적용)
 */
const normalizedFields = computed(() => {
  const fields = mergedSetting.value.fields || [];
  return fields.map(field => {
    // 깊은 복사 또는 props 병합
    const defaultProps = {
      labelAlign: 'right' // 기본값: 오른쪽 정렬
    };
    
    return {
      ...field,
      props: {
        ...defaultProps,
        ...(field.props || {})
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
  fields.forEach(field => {
    if (!(field.field in fieldValues)) {
      fieldValues[field.field] = getDefaultValue(field);
    }
  });
};

/**
 * 외부에서 현재 필드 값들을 가져가는 메서드
 */
const getFieldValues = () => {
  return { ...fieldValues };
};

/**
 * 그리드 스타일 계산
 */
const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${mergedSetting.value.columns}, 1fr)`,
  gap: '10px',
  alignItems: 'end'
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
  return fieldValues[field.field];
};

/**
 * 필드 값 업데이트 처리
 */
const handleUpdate = (field, value) => {
  // 내부 상태 업데이트
  fieldValues[field.field] = value;
  
  // 외부로 이벤트 발생 (하위 호환성)
  emit('update:field', field.field, value);

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
    const targetComponent = componentRegistry.get(mergedSetting.value.target);
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
    const targetComponent = componentRegistry.get(mergedSetting.value.target);
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
      reset: handleReset
    });
  }
});

/**
 * 외부에서 접근 가능한 메서드 노출
 */
defineExpose({
  getFieldValues,
  reset: handleReset
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

.filter-grid {
  flex: 1;
  width: 100%;
}

.filter-field {
  min-width: 0; /* 그리드 아이템이 오버플로우되지 않도록 */
}

.button-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 반응형 처리 */
@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-field {
    grid-column: span 12 !important;
  }
  
  .button-group {
    justify-content: flex-end;
    margin-bottom: 0;
  }
}
</style>
