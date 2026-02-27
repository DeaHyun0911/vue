<template>
  <div class="ctv-query-filter">
    <div class="filter-container">
      <!-- 필터 필드 영역 -->
      <ctv-form 
        class="filter-form" 
        :columns="responsiveColumns" 
        :label-width="mergedSetting.labelWidth"
        :label-position="mergedSetting.labelPosition"
        :model="fieldValues"
        :rules="processedRules"
        :validate-on-rule-change="false"
        ref="formRef"
        :style="formStyle"
      >
        <ctv-form-item
          v-for="(field, index) in visibleFields"
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
            :disabled="resolvedButtons.query.disabled || !isFormValid"
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

        <!-- 사용자 정의 버튼 (설정 기반) -->
        <ctv-button 
            v-for="(btn, i) in mergedSetting.customButtons"
            :key="i"
            v-bind="btn"
            @click="typeof btn.action === 'function' ? btn.action($event) : undefined"
        >
          {{ btn.label }}
        </ctv-button>
        
        <!-- 사용자 정의 버튼 (직접 Slot) -->
        <slot name="buttons"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, nextTick, ref, onUnmounted } from 'vue';
import componentRegistry from '../utils/componentRegistry.js';
import { resolveTarget } from '../utils/actionUtils.js';

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
   * 타겟 컴포넌트 ID (단일 컴포넌트 또는 그룹 모두 지원)
   * CtvToolBox와 동일하게 target 하나로 통일
   */
  target: {
    type: String,
    default: null
  },
  /**
   * @deprecated target으로 통합. 하위 호환성을 위해 유지.
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
  rules: {
    type: Object,
    default: () => ({})
  },
  customButtons: {
    type: Array,
    default: () => []
  },
  setting: { type: Object, default: null }
});

const mergedSetting = computed(() => {
    const settings = props.setting || {};
    return {
        columns: props.columns !== 12 ? props.columns : (settings.columns || 12),
        fields: (props.fields && props.fields.length) ? props.fields : (settings.fields || []),
        target: props.target || settings.target || props.group || settings.group,
        showButtons: props.showButtons !== true ? props.showButtons : (settings.showButtons !== undefined ? settings.showButtons : true),
        buttonLabels: props.buttonLabels && Object.keys(props.buttonLabels).length !== 2 ? props.buttonLabels : (settings.buttonLabels || { query: '조회', reset: '초기화' }),
        buttons: props.buttons && Object.keys(props.buttons).length ? props.buttons : (settings.buttons || {}),
        id: props.id || settings.id,
        labelWidth: props.labelWidth !== 'auto' ? props.labelWidth : (settings.labelWidth || 'auto'),
        labelPosition: props.labelPosition !== 'right' ? props.labelPosition : (settings.labelPosition || 'right'),
        collapsible: props.collapsible !== true ? props.collapsible : (settings.collapsible !== undefined ? settings.collapsible : true),
        rules: props.rules && Object.keys(props.rules).length ? props.rules : (settings.rules || {}),
        customButtons: (props.customButtons && props.customButtons.length) ? props.customButtons : (settings.customButtons || [])
    };
});

/**
 * 전역 및 로컬 규칙 가공 (message 자동 생성)
 */
const processedRules = computed(() => {
    const rules = mergedSetting.value.rules || {};
    const fields = mergedSetting.value.fields || [];
    
    // 필드 키 -> 타이틀 맵 생성 (메시지 생성용)
    const titleMap = {};
    fields.forEach(f => {
        const title = f.props?.title || f.title;
        if (title) {
            const key = f.field;
            if (Array.isArray(key)) {
                key.forEach(k => { if(!titleMap[k]) titleMap[k] = title; });
            } else if (key) {
                titleMap[key] = title;
            }
        }
    });

    const result = {};
    Object.keys(rules).forEach(key => {
        const ruleList = Array.isArray(rules[key]) ? rules[key] : [rules[key]];
        result[key] = ruleList.map(r => {
            if (r.required && !r.message) {
                const title = titleMap[key] || key;
                return { ...r, message: `${title}은(는) 필수값입니다.` };
            }
            return r;
        });
    });
    return result;
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
    const finalBase = Math.min(5, base); // columns는 최대 5개로 제한
    
    if (windowWidth.value <= 768) return 1;
    if (windowWidth.value <= 1450) return Math.min(2, finalBase);
    if (windowWidth.value <= 2100) return Math.min(4, finalBase);
    
    return finalBase;
});

const emit = defineEmits(['update:field', 'query', 'reset']);

/**
 * 정규화된 필드 목록 (기본값 적용)
 */
const normalizedFields = computed(() => {
  const fields = mergedSetting.value.fields || [];
  const rules = processedRules.value;
  
  return fields.map(field => {
    // 1. 프레임워크 전용 속성 분리
    const { 
        component, field: fKey, span, slots, autoLoad, parent, 
        condition, style, modelValue, props: fieldProps,
        visible, disabled,
        ...rest 
    } = field;

    // 2. 동적 속성 계산
    let extraProps = {};
    if (typeof condition === 'function') {
        extraProps = condition(fieldValues);
    }
    
    // 2-1. visible, disabled 처리 (boolean 또는 function)
    let isVisible = visible !== false;
    if (typeof visible === 'function') {
        isVisible = visible(fieldValues);
    }
    
    let isDisabled = disabled === true;
    if (typeof disabled === 'function') {
        isDisabled = disabled(fieldValues);
    }
    

    // 3. 필수값 체크 로직 (기존 로직 유지하되 rest 속성도 고려)
    let isRequired = false;
    if (fieldProps?.required || rest.required) {
        isRequired = true;
    } else {
        const fieldNames = Array.isArray(fKey || field.field) ? (fKey || field.field) : [(fKey || field.field)];
        
        for (const name of fieldNames) {
            // 전역 규칙
            if (rules[name]) {
                const ruleList = Array.isArray(rules[name]) ? rules[name] : [rules[name]];
                if (ruleList.some(r => r.required)) {
                    isRequired = true;
                    break;
                }
            }
            // 개별 필드 레벨 규칙
            const localRules = fieldProps?.rules || rest.rules;
            if (localRules) {
                 const ruleList = Array.isArray(localRules) ? localRules : [localRules];
                 if (ruleList.some(r => r.required)) {
                     isRequired = true;
                     break;
                 }
            }
        }
    }
    
    // 4. Props 병합 (우선순위: extraProps > fieldProps > rest > default)
    // 개별 필드 레벨 규칙 가공 (message 자동 생성)
    const localRules = fieldProps?.rules || rest.rules;
    let processedLocalRules = localRules;
    if (localRules) {
        const ruleList = Array.isArray(localRules) ? localRules : [localRules];
        const title = fieldProps?.title || rest.title || (Array.isArray(fKey) ? fKey[0] : fKey);
        processedLocalRules = ruleList.map(r => {
            if (r.required && !r.message) {
                return { ...r, message: `${title}은(는) 필수값입니다.` };
            }
            return r;
        });
    }

    const mergedProps = {
      labelAlign: 'right', // 기본값
      ...rest,
      ...(fieldProps || {}),
      ...extraProps,
      required: isRequired,
      disabled: isDisabled,
      rules: processedLocalRules
    };

    // 5. Slots 플랫화 처리
    let normalizedSlots = undefined;
    if (slots) {
        normalizedSlots = {};
        Object.keys(slots).forEach(key => {
            const slotItem = slots[key];
            if (slotItem && typeof slotItem === 'object') {
                const { component: sComp, field: sField, props: sProps, ...sRest } = slotItem;
                normalizedSlots[key] = {
                    ...slotItem,
                    props: {
                        ...(sRest || {}),
                        ...(sProps || {})
                    }
                };
            } else {
                normalizedSlots[key] = slotItem;
            }
        });
    }

    return {
      ...field,
      props: mergedProps,
      visible: isVisible,
      slots: normalizedSlots
    };
  });
});

const isExpanded = ref(false);

const layoutInfo = computed(() => {
    const cols = responsiveColumns.value;
    const allFields = normalizedFields.value;
    const fields = allFields.filter(f => f.visible !== false);
    
    let currentRow = 1;
    let currentSpanSum = 0;
    
    // 각 필드의 row 할당 계산
    const rowAssignments = fields.map(field => {
        const span = field.span || 1;
        const actualSpan = Math.min(span, cols);
        
        if (currentSpanSum + actualSpan > cols) {
            currentRow++;
            currentSpanSum = actualSpan;
        } else {
            currentSpanSum += actualSpan;
        }
        return currentRow;
    });
    
    // 화면에 3줄 이상이면 collapsible 버튼 활성화
    const isCollapsibleActive = mergedSetting.value.collapsible && currentRow >= 3;
    
    return {
        totalRows: currentRow,
        isCollapsibleActive,
        rowAssignments
    };
});

// 화면에 보일 실제 필드
const visibleFields = computed(() => {
    // 1. visible 속성이 false인 필드 1차 필터링
    const activeFields = normalizedFields.value.filter(f => f.visible !== false);
    
    // 2. 접힘(collapsible) 상태에 따른 2차 필터링
    if (!layoutInfo.value.isCollapsibleActive || isExpanded.value) {
        return activeFields; // 전체 표시
    }
    
    // 접힌 상태 (currentRow = 1 인 것만 표시)
    return activeFields.filter((field, index) => {
        return layoutInfo.value.rowAssignments[index] === 1;
    });
});

/**
 * 버튼 설정 정규화 (함수형 조건 처리 추가)
 */
const resolvedButtons = computed(() => {
    const defaults = {
        query: { visible: true, disabled: false },
        reset: { visible: true, disabled: false }
    };

    const userConfig = mergedSetting.value.buttons || {};
    const values = fieldValues; // 현재 필드 값들

    const resolve = (btnConfig, def) => {
        const config = { ...def, ...(btnConfig || {}) };
        
        // visible 처리
        if (typeof config.visible === 'function') {
            config.visible = config.visible(values);
        }
        
        // disabled 처리
        if (typeof config.disabled === 'function') {
            config.disabled = config.disabled(values);
        }
        
        return config;
    };

    return {
        query: resolve(userConfig.query, defaults.query),
        reset: resolve(userConfig.reset, defaults.reset)
    };
});

/**
 * 내부 필드 값 관리 (자체 상태 관리)
 */
const fieldValues = reactive({});

/**
 * ctv-date의 defaultValue 키워드를 실제 날짜 문자열로 변환
 * @param {'today'|'thisMonth'|'thisYear'|{offset:number,unit:'month'|'year'}|string} keyword
 * @param {string} type - ctv-date의 type 속성 (date, month, year, daterange 등)
 */
const resolveDateKeyword = (keyword, type) => {
    if (keyword === undefined || keyword === null || keyword === '') return keyword;

    // 포맷터: type에 따라 YYYYMMDD / YYYYMM / YYYY 반환
    const fmt = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        if (type?.includes('month')) return `${y}${m}`;
        if (type?.includes('year'))  return `${y}`;
        return `${y}${m}${d}`;
    };

    const now = new Date();

    // 문자열 키워드
    if (typeof keyword === 'string') {
        if (keyword === 'today')     return fmt(now);
        if (keyword === 'thisMonth') return fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        if (keyword === 'thisYear')  return fmt(new Date(now.getFullYear(), 0, 1));
        return keyword; // 이미 실제 날짜 문자열인 경우 그대로 반환
    }

    // 객체 키워드: { offset: -1, unit: 'month' }
    if (keyword && typeof keyword === 'object' && 'offset' in keyword) {
        const { offset, unit } = keyword;
        const target = new Date(now);
        if (unit === 'month') target.setMonth(target.getMonth() + offset);
        if (unit === 'year')  target.setFullYear(target.getFullYear() + offset);
        // month 단위이고 type이 date 계열이면 해당 월의 1일로
        if (unit === 'month' && !type?.includes('month') && !type?.includes('year')) {
            target.setDate(1);
        }
        return fmt(target);
    }

    return keyword;
};

/**
 * 필드의 기본값 결정
 */
const getDefaultValue = (field) => {
  // props에 defaultValue가 있으면 사용
  if (field.props?.defaultValue !== undefined) {
    const dv = field.props.defaultValue;
    // ctv-date 계열 컴포넌트인 경우 키워드 변환 적용
    if (field.component === 'ctv-date') {
        const type = field.props?.type || field.type;
        if (Array.isArray(dv)) {
            return dv.map(v => resolveDateKeyword(v, type));
        }
        return resolveDateKeyword(dv, type);
    }
    return dv;
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
  const fields = normalizedFields.value;
  
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
 * 실시간 폼 유효성 체크 computed (조회 버튼 비활성화 용도)
 */
const isFormValid = computed(() => {
    let valid = true;
    const rules = processedRules.value;
    
    // 1. 전역 rules 검사
    Object.keys(rules).forEach(field => {
        const ruleArray = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
        const value = fieldValues[field];
        
        ruleArray.forEach(rule => {
             // 필수값 체크
             if (rule.required && (value === undefined || value === null || value === '')) {
                 valid = false;
             }
             // 정규식 체크
             if (rule.pattern && value) {
                 const regex = new RegExp(rule.pattern);
                 if (!regex.test(value)) {
                     valid = false;
                 }
             }
        });
    });
    
    // 2. 개별 필드 레벨의 required 속성 검사
    normalizedFields.value.forEach(field => {
         if (field.visible === false) return; // 숨겨진 필드는 검사 제외
         
         const isRequired = field.props?.required;
         const val = getModelValue(field);
         if (isRequired) {
             if (Array.isArray(val)) {
                 if (val.length === 0) valid = false;
             } else if (val === undefined || val === null || val === '') {
                 valid = false;
             }
         }
    });

    return valid;
});

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
const handleQuery = async () => {
  // 실제 조회 진입 전, 폼 전체 유효성 검사 실행 (실패 시 에러 메시지 표시 및 리턴)
  if (formRef.value) {
    try {
      await formRef.value.validate();
    } catch (error) {
       console.warn('[CtvQueryFilter] Validation failed', error);
       return;
    }
  }

  // target이 지정된 경우 (단일 컴포넌트 또는 그룹 모두 resolveTarget이 처리)
  const targetId = mergedSetting.value.target;
  if (targetId) {
    const targetComponent = resolveTarget(targetId);
    if (targetComponent?.query) {
      targetComponent.query();
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
  const fields = normalizedFields.value;
  fields.forEach(field => {
    const defaultValue = getDefaultValue(field);
    
    // 내부 상태 업데이트
    fieldValues[field.field] = defaultValue;
    
    // 외부로 이벤트 발생 (하위 호환성)
    emit('update:field', field.field, defaultValue);
  });

  // target이 지정된 경우
  const targetId = mergedSetting.value.target;
  if (targetId) {
    const targetComponent = resolveTarget(targetId);
    if (targetComponent?.reset) {
      targetComponent.reset();
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

<style>

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

.ctv-query-filter .ctv-form {
  align-items: start;
}

.ctv-query-filter .ctv-form .el-form-item__error {
  position: unset;
}


</style>
