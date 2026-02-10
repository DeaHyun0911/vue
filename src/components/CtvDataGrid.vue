<template>
  <div class="ctv-data-grid">
    <div ref="gridContainer"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { 
  getDefaultGridConfig, 
  getEditableGridConfig,
  applyColTypeToColumns,
  applyDefaultUnitToColumns
} from '../utils/gridUtils.js';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  gridConfig: {
    type: Function,
    required: true
  },
  editable: {
    type: Boolean,
    default: true
  },
  autoLoad: {
    type: Boolean,
    default: false
  },
  dataQuery: {
    type: Object,
    default: () => ({})
  },
  saveQuery: {
    type: Object,
    default: () => ({})
  },
  /**
   * 데이터 제공자 (설정 객체 또는 함수)
   * 
   * 1. 설정 객체일 경우:
   * {
   *   path: 'Handler.ashx',
   *   funcNm: 'UfnQuery',
   *   params: reactive 객체 또는 함수,
   *   filterRef: 'filter1',  // CtvQueryFilter의 id (필터 값 자동 수집)
   *   dataPath: 'rsData01'
   * }
   * 
   * 2. 함수일 경우:
   * async (params) => { return [ ...data ]; }
   * 함수는 Promise를 반환해야 하며, 데이터 배열을 resolve 해야 함.
   */
  query: {
    type: [Object, Function],
    default: null
  },
  toolBox: {
    type: [Object, Boolean],
    default: false
  },
  height: {
    type: String,
    default: null
  },
  autoHeight: {
    type: Boolean,
    default: true
  },
  minHeight: {
    type: String,
    default: "300px"
  },
  maxHeight: {
    type: String,
    default: null
  },
  defaultValue: {
    type: [Object, Function],
    default: null
  },
  title: {
    type: String,
    default: null
  },
  id: {
    type: String,
    default: null
  },
  group: {
    type: String,
    default: null
  },
  /**
   * 그리드 초기화 준비 상태 (true일 때 생성)
   */
  ready: {
    type: Boolean,
    default: true
  }
});

const gridContainer = ref(null);
const datagrid = ref(null);

/**
 * 그리드 데이터 설정
 */
const setData = async (data) => {
  if (!datagrid.value) return;

  if (!data) {
    await SBGrid3.setClientData(datagrid.value, []);
    return;
  }

  let gridData = data;
  if (typeof data === 'string') {
    try {
      gridData = JSON.parse(data);
    } catch (e) {
      console.error("[CtvDataGrid] 데이터 파싱 실패:", e);
      return;
    }
  }

  if (!Array.isArray(gridData)) {
    if (gridData && typeof gridData === 'object') {
      gridData = [gridData];
    } else {
      gridData = [];
    }
  }

  await SBGrid3.setClientData(datagrid.value, gridData);
};

/**
 * 그리드 높이 계산 및 업데이트
 */
const updateGridHeight = (isInitial = false) => {
  if (!gridContainer.value) return;

  // 1. autoHeight: false 설정 시 (고정 높이 모드)
  if (props.autoHeight === false) {
    if (isInitial && props.height) {
      gridContainer.value.style.height = props.height;
    }
    return;
  }

  // 2. autoHeight: true 설정 시 (화면 채움 모드) - 기본값
  const bottomMargin = 20; // 하단 여백 (px)

  if (props.height) {
    // 설정에 고정 높이가 있으면 우선 사용
    gridContainer.value.style.height = props.height;
  } else {
    // 요소의 문서 내 절대 위치(Y) 계산
    const rect = gridContainer.value.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const absoluteTop = rect.top + scrollTop;

    // CSS calc를 적용하여 브라우저 리사이즈 시에도 100vh 기준으로 자동 조절
    gridContainer.value.style.height = `calc(100vh - ${absoluteTop}px - ${bottomMargin}px)`;
  }

  // 3. 최소 높이 설정
  const minHeight = props.minHeight || "300px";
  gridContainer.value.style.minHeight = minHeight;

  // 4. 최대 높이 설정 (옵션)
  if (props.maxHeight) {
    gridContainer.value.style.maxHeight = props.maxHeight;
  }

  // 5. Flexbox 스타일 적용
  gridContainer.value.style.display = 'flex';
  gridContainer.value.style.flexDirection = 'column';
};

/**
 * 동적 높이 설정 및 ResizeObserver 설정
 */
let resizeObserver = null;
let handleResize = null;

const setupDynamicHeight = () => {
  // autoHeight 옵션이 false일 때는 처음 렌더링 시 높이만 고정
  if (props.autoHeight === false) {
    updateGridHeight(true);
    return;
  }

  // 초기 높이 계산 및 적용
  updateGridHeight();

  // ResizeObserver 설정 (화면 크기 변경 감지)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateGridHeight();
    });

    // body 또는 부모 컨테이너 관찰
    const observeTarget = gridContainer.value?.parentElement || document.body;
    resizeObserver.observe(observeTarget);

    // window도 관찰 (브라우저 창 크기 변경)
    resizeObserver.observe(document.documentElement);
  }

  // fallback: window resize 이벤트 (ResizeObserver 미지원 시)
  handleResize = () => {
    updateGridHeight();
  };
  window.addEventListener('resize', handleResize);
};

const state = reactive({
  datagrid: null,
  comboData: window.gGridComboData || {},
  localData: [],
});

/**
 * Grid Configuration Computed Property
 * Tracks dependencies (like options) used in gridConfig
 */
const computedGridConfig = computed(() => {
  if (!props.ready) return null;
  try {
    return props.gridConfig(state);
  } catch (e) {
    console.error("[CtvDataGrid] gridConfig 실행 중 오류:", e);
    return null;
  }
});

/**
 * 그리드 생성
 */
const createGrid = async () => {
  if (typeof SBGrid3 === "undefined" || typeof SBGrid3.createGrid !== "function") {
    console.error("SBGrid3 라이브러리가 로드되지 않았습니다.");
    if (gridContainer.value) {
      gridContainer.value.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">SBGrid3 라이브러리를 로드해주세요.</div>';
    }
    return;
  }

  // 기존 그리드 파괴 (재생성 시)
  if (datagrid.value && typeof SBGrid3.destroy === 'function') {
    SBGrid3.destroy(datagrid.value);
    datagrid.value = null;
    state.datagrid = null;
  }

  const gridConfig = computedGridConfig.value;
  if (!gridConfig) return;

  try {
    // ===== 컬럼 전처리 =====
    // Deep clone to avoid mutating computed property
    // Functions are lost in JSON stringify/parse, need to copy them back or use shallow clone + manual deep copy for arrays?
    // Better: Helper to clone config preserving functions but safe for modification
    // For now, let's use the object directly but handle mutations carefully?
    // SBGrid3 modifies config? Probably.
    // Let's manually copy key properties to a new object.
    
    const finalConfig = { ...gridConfig };
    
    if (finalConfig.columns && Array.isArray(finalConfig.columns)) {
       // Deep copy columns to allow modification
       finalConfig.columns = finalConfig.columns.map(col => ({ ...col }));
       
      // 1. colType 파싱
      finalConfig.columns = applyColTypeToColumns(finalConfig.columns);

      // 2. defaultUnit 처리 (SBGrid3 옵션 아님 - 제거 필요)
      if (finalConfig.defaultUnit !== undefined) {
        finalConfig.columns = applyDefaultUnitToColumns(
          finalConfig.columns,
          finalConfig.defaultUnit
        );
        delete finalConfig.defaultUnit;
      }
    }

    // ===== 컨테이너 설정 =====
    finalConfig.container = gridContainer.value;

    // ===== 기본 설정 병합 =====
    const defaultConfig = getDefaultGridConfig();
    SBGrid3.setGridDefault(defaultConfig);

    // excelExport 설정
    if (!finalConfig.excelExport) {
      finalConfig.excelExport = {
        fileName: `${props.title || 'grid_export'}.xlsx`,
        cellStyle: true,
      };
    }

    // ===== 편집 모드 설정 병합 =====
    // ... (Logics remain same, verify references) ...
    // Since we are inside the same scope, I can reuse previous logic but need to ensure it uses finalConfig
    
    if (props.editable !== false) {
      const editableConfig = getEditableGridConfig();

      if (finalConfig.showStatus === undefined) finalConfig.showStatus = editableConfig.showStatus;
      if (finalConfig.navigatable === undefined) finalConfig.navigatable = editableConfig.navigatable;
      if (finalConfig.hideDeleted === undefined) finalConfig.hideDeleted = editableConfig.hideDeleted;
      if (finalConfig.editable === undefined) finalConfig.editable = editableConfig.editable;
      if (finalConfig.copyable === undefined) finalConfig.copyable = editableConfig.copyable;
      if (finalConfig.pasteable === undefined) finalConfig.pasteable = editableConfig.pasteable;
      if (finalConfig.contextMenu === undefined) finalConfig.contextMenu = editableConfig.contextMenu;
    } else {
      if (finalConfig.editable === undefined) finalConfig.editable = false;
      if (finalConfig.copyable === undefined) finalConfig.copyable = defaultConfig.copyable;
      if (finalConfig.pasteable === undefined) finalConfig.pasteable = false;
    }

    // ===== SBGrid3 생성 =====
    datagrid.value = SBGrid3.createGrid(finalConfig);

    if (!datagrid.value) {
      throw new Error("SBGrid3.createGrid가 null을 반환했습니다.");
    }

    state.datagrid = datagrid.value;

    // ===== 동적 높이 설정 =====
    setupDynamicHeight();

    console.log('[CtvDataGrid] 그리드 생성 완료', datagrid.value);
    
    // 데이터가 이미 로드되어 있었다면 다시 설정? 
    // This might be tricky if data was loaded. 
    // Ideally user relies on query() after creation or autoLoad.
    
    // autoLoad가 true면 자동 조회
    // But we don't want to double query. 
    // If it's initial load, yes.
    if (props.autoLoad && props.query && !state.localData.length) { // Simple check
       await query();
    }

  } catch (error) {
    console.error("[CtvDataGrid] 그리드 생성 중 오류:", error);
    if (gridContainer.value) {
      gridContainer.value.innerHTML = `<div style="padding: 20px; text-align: center; color: #f56c6c;">그리드 생성 실패: ${error.message}</div>`;
    }
  }
};

/**
 * 데이터 조회 메서드
 */
const query = async () => {
  if (!props.query) {
    console.warn('[CtvDataGrid] query가 설정되지 않았습니다.');
    return;
  }

  try {
    // 1. query가 함수인 경우 (커스텀 조회)
    if (typeof props.query === 'function') {
      const data = await props.query();
      await setData(data);
      return;
    }

    // 2. query가 객체인 경우 (기존 방식)
    const { path, funcNm, params, filterRef, dataPath = 'rsData01' } = props.query;
    
    let queryParams;
    
    // filterRef가 지정된 경우 필터의 값을 자동으로 수집
    if (filterRef) {
      const filterComponent = componentRegistry.get(filterRef);
      if (filterComponent && filterComponent.getFieldValues) {
        const filterValues = filterComponent.getFieldValues();
        
        // params가 함수면 filterValues를 인자로 전달
        if (typeof params === 'function') {
          queryParams = params(filterValues);
        } else {
          // params가 없으면 filterValues의 값들을 순서대로 사용
          queryParams = [
            top.gSInfo?.[window.ERPSDB] || '',
            ...Object.values(filterValues)
          ];
        }
      } else {
        console.warn(`[CtvDataGrid] filterRef "${filterRef}"에 해당하는 컴포넌트를 찾을 수 없거나 getFieldValues 메서드가 없습니다.`);
        return;
      }
    } else {
      // filterRef가 없으면 기존 방식대로 params 사용
      queryParams = typeof params === 'function' ? params() : params;
    }
    
    // Ctv.dataQuery 호출
    const Ctv = window.Ctv;
    if (!Ctv || !Ctv.dataQuery) {
      console.error('[CtvDataGrid] Ctv.dataQuery를 찾을 수 없습니다.');
      return;
    }

    const data = await Ctv.dataQuery({
      path,
      funcNm,
      bParam: Array.isArray(queryParams) ? queryParams : [
        top.gSInfo?.[window.ERPSDB] || '',
        ...Object.values(queryParams || {})
      ]
    });

    // 데이터 설정
    if (data && data[dataPath]) {
      await setData(data[dataPath]);
    }
  } catch (error) {
    console.error('[CtvDataGrid] 조회 오류:', error);
  }
};

/**
 * 초기화 메서드 (빈 데이터로 리셋)
 */
const reset = async () => {
  await setData([]);
};

// ready prop 변경 감지 생략 (이제 computedGridConfig가 담당)

// Watch configuration changes to rebuild grid
watch(computedGridConfig, async (newVal, oldVal) => {
  // Deep comparison or just assume change if reference changed?
  // computed returns new object from gridConfig() function usually.
  if (newVal) {
     await createGrid();
  }
}, { deep: true }); // computed value might need deep watch if it returns same object reference but mutated internals? No, typical usage returns new object. But computed tracks dependencies.

onMounted(async () => {
  // Initial creation if config is ready
  if (computedGridConfig.value) {
      await createGrid();
  }
  
  // 컴포넌트 레지스트리에 등록
  if (props.id) {
    componentRegistry.register(props.id, {
      group: props.group,
      query,
      reset,
      setData,
      datagrid
    });
  }
});

onBeforeUnmount(() => {
  // 컴포넌트 레지스트리에서 제거
  if (props.id) {
    componentRegistry.unregister(props.id);
  }
  
  // ResizeObserver 정리
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // window resize 이벤트 정리
  if (handleResize) {
    window.removeEventListener('resize', handleResize);
    handleResize = null;
  }

  // 그리드 정리 로직 (필요시)
  if (datagrid.value && typeof SBGrid3.destroy === 'function') {
    SBGrid3.destroy(datagrid.value);
  }
});

// 외부에서 접근 가능한 메서드 노출
defineExpose({
  setData,
  datagrid
});
</script>

<style scoped>
.ctv-data-grid {
  width: 100%;
  height: 100%;
}


</style>
