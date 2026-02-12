<template>
  <div 
    class="ctv-data-grid" 
    :class="{ 'is-active': isActive }"
    @click="handleActive"
  >
    <div ref="gridContainer"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, markRaw, nextTick, unref, isRef } from 'vue';
import { ElMessageBox, ElLoading } from 'element-plus';
import { 
  getDefaultGridConfig, 
  getEditableGridConfig,
  applyColTypeToColumns,
  applyLockTypeToColumns,
  applyDefaultUnitToColumns
} from '../utils/gridUtils.js';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  gridConfig: {
    type: [Object, Function],
    default: null // setting 사용 시 생략 가능하므로 required 제거, default null
  },
  editable: {
    type: Boolean,
    default: undefined
  },
  autoLoad: {
    type: Boolean,
    default: undefined
  },
  autoFocus: {
    type: Boolean,
    default: undefined
  },
  dataQuery: {
    type: Object,
    default: () => ({})
  },
  save: {
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
    default: undefined
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
    default: undefined
  },
  /**
   * 통합 설정 객체 (gridConfig, query, save, editable 등 포함)
   */
  setting: {
    type: Object,
    default: null
  }
});

const gridContainer = ref(null);
const hasChanges = ref(false); // 변경 상태 추적
const datagrid = reactive({ grid: null });

/**
 * Props와 Setting 병합된 최종 설정
 */
const mergedSetting = computed(() => {
  const settings = props.setting || {};
  return {
    gridConfig: props.gridConfig || settings.gridConfig,
    editable: props.editable !== undefined ? props.editable : (settings.editable !== undefined ? settings.editable : true),
    autoLoad: props.autoLoad !== undefined ? props.autoLoad : (settings.autoLoad !== undefined ? settings.autoLoad : true),
    dataQuery: props.dataQuery && Object.keys(props.dataQuery).length ? props.dataQuery : (settings.dataQuery || {}),
    save: props.save && Object.keys(props.save).length ? props.save : (settings.save || {}),
    query: props.query || settings.query || null,
    toolBox: props.toolBox || settings.toolBox || false,
    height: props.height || settings.height || null,
    autoHeight: props.autoHeight !== undefined ? props.autoHeight : (settings.autoHeight !== undefined ? settings.autoHeight : true),
    minHeight: props.minHeight || settings.minHeight || "300px",
    maxHeight: props.maxHeight || settings.maxHeight || null,
    defaultValue: props.defaultValue || settings.defaultValue || null,
    title: props.title || settings.title || null,
    id: props.id || settings.id || null,
    group: props.group || settings.group || null,
    ready: props.ready !== undefined ? props.ready : (settings.ready !== undefined ? settings.ready : true),
    autoFocus: props.autoFocus !== undefined ? props.autoFocus : (settings.autoFocus !== undefined ? settings.autoFocus : true),
    syncForm: settings.syncForm || null,
    focusData: props.focusData || settings.focusData || null, // focusData 추가
  };
});

/**
 * 그리드 데이터 설정
 */
const setData = async (data) => {
  if (!datagrid.grid) return;

  if (!data) {
    await SBGrid3.setClientData(datagrid.grid, []);
    state.lastFocusedRowIndex = null;
    state.focusData = null;
    clearSyncForm();
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

  await SBGrid3.setClientData(datagrid.grid, gridData);
  state.lastFocusedRowIndex = null;
  state.totalRows = gridData.length;
  state.isLoaded = true;
  state.selectedRowIdx = -1; // 데이터 로드 시 선택 초기화
  state.selectedRowIdx = -1; // 데이터 로드 시 선택 초기화
  state.focusData = {}; // 데이터 로드 시 포커스 데이터 초기화
  
  // 데이터 로드 시 변경 상태 초기화
  hasChanges.value = false;

  // 데이터가 비어있으면 syncForm 초기화
  if (gridData.length === 0) {
    clearSyncForm();
  }
};

/**
 * 그리드 높이 계산 및 업데이트
 */
const updateGridHeight = (isInitial = false) => {
  if (!gridContainer.value) return;

  // 1. autoHeight: false 설정 시 (고정 높이 모드)
  if (mergedSetting.value.autoHeight === false) {
    if (isInitial && mergedSetting.value.height) {
      gridContainer.value.style.height = mergedSetting.value.height;
    }
    return;
  }

  // 2. autoHeight: true 설정 시 (화면 채움 모드) - 기본값
  const bottomMargin = 20; // 하단 여백 (px)

  if (mergedSetting.value.height) {
    // 설정에 고정 높이가 있으면 우선 사용
    gridContainer.value.style.height = mergedSetting.value.height;
  } else {
    // 요소의 문서 내 절대 위치(Y) 계산
    const rect = gridContainer.value.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const absoluteTop = rect.top + scrollTop;

    // CSS calc를 적용하여 브라우저 리사이즈 시에도 100vh 기준으로 자동 조절
    gridContainer.value.style.height = `calc(100vh - ${absoluteTop}px - ${bottomMargin}px)`;
  }

  // 3. 최소 높이 설정
  const minHeight = mergedSetting.value.minHeight || "300px";
  gridContainer.value.style.minHeight = minHeight;

  // 4. 최대 높이 설정 (옵션)
  if (mergedSetting.value.maxHeight) {
    gridContainer.value.style.maxHeight = mergedSetting.value.maxHeight;
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
  if (mergedSetting.value.autoHeight === false) {
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
  lastFocusedRowIndex: null,
  totalRows: 0,
  selectedRowIdx: -1,
  isLoaded: false,
  selectedRowIdx: -1,
  isLoaded: false,
  focusData: {}, // Initialize as empty object to prevent null access errors
  focusStatus: null, // 포커스된 행의 상태
});

/**
 * Grid Configuration Computed Property
 * Tracks dependencies (like options) used in gridConfig
 */
const computedGridConfig = computed(() => {
  if (!mergedSetting.value.ready) return null;
  try {
    let config = null;
    if (typeof mergedSetting.value.gridConfig === 'function') {
      config = mergedSetting.value.gridConfig(state);
    } else {
      config = mergedSetting.value.gridConfig;
    }

    if (!config) return null;

    // 콤보 로딩 상태 자동 체크 (깜빡임 방지)
    // inputCombo나 combo 속성에 배열이 지정되어 있는데, 아직 __loaded 플래그가 없고 비어있다면 대기
    if (config.columns && Array.isArray(config.columns)) {
        for (const col of config.columns) {
            const combo = col.inputCombo || col.combo;

            if (Array.isArray(combo) && combo.length === 0 && !combo.__loaded) {
                return null;
            }

        }
    }

    return config;
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
  if (datagrid.grid && typeof SBGrid3.destroy === 'function') {
    SBGrid3.destroy(datagrid.grid);
    datagrid.grid = null;
    state.datagrid = null;
  }

  // syncForm watcher 정리
  if (syncFormWatcher) {
    syncFormWatcher();
    syncFormWatcher = null;
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
      
      // 1-1. lockType 파싱
      finalConfig.columns = applyLockTypeToColumns(finalConfig.columns, () => datagrid.grid);

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
        fileName: `${mergedSetting.value.title || 'grid_export'}.xlsx`,
        cellStyle: true,
      };
    }

    // ===== 편집 모드 설정 병합 =====
    // ... (Logics remain same, verify references) ...
    // Since we are inside the same scope, I can reuse previous logic but need to ensure it uses finalConfig
    
    if (mergedSetting.value.editable !== false) {
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

    // ===== rowChange 이벤트 지원 (Focus 이벤트 활용) =====
    finalConfig.doCommand = finalConfig.doCommand || {};
    // rowChange 설정이 gridConfig나 doCommand에 있을 수 있음. 
    // 보통 gridConfig.doCommand.rowChange로 옴.
    // 기존 핸들러 백업
    const originalRowChange = finalConfig.doCommand?.rowChange;
    const originalFocus = finalConfig.doCommand?.focus;

    finalConfig.doCommand.focus = (grid, command) => {
        // 0. 활성 상태 처리
        handleActive();

        // 사용자 정의 focus 핸들러 호출
        if (originalFocus) originalFocus(grid, command);

        // 1. 포커스된 열 정보 가져오기
        const col = SBGrid3.getFocusedColumn(grid);
        // StickyColumn이 포커스된 경우 무시
        if (col && col.constructor.name === 'StickyColumn') return;

        // 2. 현재 포커스된 행의 인덱스 가져오기
        const focusedRow = SBGrid3.getFocusedRow(grid);
        const currentRowIndex = focusedRow ? focusedRow._rowIndex : null;
        
        // 3. 포커스된 값 가져오기 (셀 값)
        const value = SBGrid3.getFocusedValue(grid);
        // state.focusData = value; // 기존: 단일 셀 값 (제거)

        // 3-1. 포커스된 행 상태 업데이트
        if (focusedRow) {
            state.focusStatus = focusedRow.status;
            
            // 3-2. 포커스된 행 데이터 전체 추출 (row object)
            // mergedSetting.value.focusData가 있으면 동기화
            updateFocusData(grid, focusedRow);
        } else {
            state.focusStatus = null;
            state.focusData = {}; // Reset to empty object
        }

        // 4. 행 인덱스가 변경되었는지 확인
        const rowIndexChanged = currentRowIndex !== null &&
            (state.lastFocusedRowIndex === null || currentRowIndex !== state.lastFocusedRowIndex);

        // 5. rowChange 이벤트 호출
        if (rowIndexChanged && value && originalRowChange && typeof originalRowChange === "function") {
            // Vue 컴포넌트 이벤트 emit도 고려할 수 있으나, 기존 callback 방식 지원
            originalRowChange(grid, value);
        }

        // 5-1. syncForm: Grid → Form (행 변경 시 폼 동기화 - 기존 방식 유지)
        if (rowIndexChanged && focusedRow) {
            syncRowToForm(grid, focusedRow);
        }

        // 6. 현재 행 인덱스 저장
        state.lastFocusedRowIndex = currentRowIndex;
        state.selectedRowIdx = currentRowIndex !== null ? currentRowIndex : -1;

        // 7. 원래 focus 이벤트 호출
        // value 유효성 체크는 상황에 따라 다를 수 있으나 원본 로직 따름
        if (value && originalFocus && typeof originalFocus === "function") {
            originalFocus(grid, value);
        }
    };

    // ===== SBGrid3 생성 =====
    // markRaw를 사용하여 그리드 인스턴스가 반응형 프록시가 되지 않도록 방지 (성능 최적화)
    const gridInstance = markRaw(SBGrid3.createGrid(finalConfig));

    if (!gridInstance) {
      throw new Error("SBGrid3.createGrid가 null을 반환했습니다.");
    }
    
    datagrid.grid = gridInstance;
    state.datagrid = gridInstance;

    // ===== 변경 감지 이벤트 등록 =====
    SBGrid3.setDoCommand(datagrid.grid, 'updated', (grid, command) => {
        updateChangeStatus();
        // syncForm: 셀 값 편집 시 폼에 반영
        const focusedRow = SBGrid3.getFocusedRow(grid);
        if (focusedRow) syncRowToForm(grid, focusedRow);
    });

    SBGrid3.setDoCommand(datagrid.grid, 'add', (grid, command) => {
        updateChangeStatus();
    });

    SBGrid3.setDoCommand(datagrid.grid, 'remove', (grid, command) => {
        updateChangeStatus();
    });

    // ===== autoFocus 설정 (기본값 true) =====
    if (mergedSetting.value.autoFocus !== false) {
        SBGrid3.setDoCommand(datagrid.grid, 'loadedView', (grid) => {
             const row = SBGrid3.getRowByIndex(grid, 0);
             if (!row) return;

             const columns = finalConfig.columns || [];
             const firstVisibleColumn = columns.find(col => {
                 if (!col.field) return false;
                 // colType으로 숨김 여부 확인
                 const colType = (col.colType || '').toUpperCase();
                 const isHidden = colType.includes('H') || 
                                  colType.includes('HIDE') || 
                                  colType.includes('HIDDEN');
                 // hidden 속성 확인 (SBGrid3 표준)
                 const isHiddenProp = col.hidden === true || col.visible === false;
                 
                 return !isHidden && !isHiddenProp;
             });

             const fieldName = firstVisibleColumn?.field || columns[0]?.field;
             if (fieldName) {
                 const column = SBGrid3.getColumnByField(grid, fieldName);
                 if (column) {
                     SBGrid3.moveFocus(grid, row, column);
                 }
             }
        });
    }

    // ===== syncForm 동기화 설정 =====
    setupSyncForm();

    // ===== focusData 동기화 설정 =====
    setupFocusDataSync();


    // ===== 동적 높이 설정 =====
    setupDynamicHeight();
    
    // 데이터가 이미 로드되어 있었다면 다시 설정? 
    // This might be tricky if data was loaded. 
    // Ideally user relies on query() after creation or autoLoad.
    
    // autoLoad가 true면 자동 조회
    // But we don't want to double query. 
    // If it's initial load, yes.
    // autoLoad가 true면 자동 조회
    // But we don't want to double query. 
    // If it's initial load, yes.
    if (mergedSetting.value.autoLoad && mergedSetting.value.query && !state.localData.length) { // Simple check
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
  if (!mergedSetting.value.query) {
    console.warn('[CtvDataGrid] query가 설정되지 않았습니다.');
    return;
  }

  const loading = ElLoading.service({ 
      lock: true, 
      text: '조회 중...', 
  });

  try {
    // 1. query가 함수인 경우 (커스텀 조회)
    if (typeof mergedSetting.value.query === 'function') {
      const data = await mergedSetting.value.query();
      await setData(data);
      return;
    }

    // 2. query가 객체인 경우 (기존 방식)
    const { path, funcNm, params, filterRef, dataPath = 'rsData01' } = mergedSetting.value.query;
    
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
    ElMessageBox.alert('데이터 조회 중 오류가 발생했습니다.', '오류', { type: 'error' });
  } finally {
      loading.close();
  }
};

const updateChangeStatus = () => {
  if (!datagrid.grid) return;
  
  // SBGrid3에서 추가, 수정, 삭제된 데이터가 있는지 확인
  const sData = SBGrid3.getSaveData(datagrid.grid, true, true, true);
  hasChanges.value = (
    sData.inserted.length > 0 || 
    sData.updated.length > 0 || 
    sData.updated.length > 0 || 
    sData.deleted.length > 0
  );

  // 포커스된 행 상태 갱신 (데이터 변경 시 상태가 변할 수 있음)
  const focusedRow = SBGrid3.getFocusedRow(datagrid.grid);
  state.focusStatus = focusedRow ? focusedRow.status : null;
};

/**
 * 포커스된 행 상태 반환 (API)
 */
const getRowStatus = () => {
    if (!datagrid.grid) return null;
    const rowItem = SBGrid3.getFocusedRow(datagrid.grid);
    return rowItem ? rowItem.status : null;
};

/**
 * columns 배열을 평탄화하여 실제 field를 가진 컬럼들만 추출
 */
const _flattenColumns = (columns, excludeEX = false) => {
  const result = [];
  if (!Array.isArray(columns)) return result;

  for (const col of columns) {
    if (col.multiColumn && Array.isArray(col.columns)) {
      result.push(..._flattenColumns(col.columns, excludeEX));
    } else if (col.field) {
      if (excludeEX) {
        const colType = (col.colType || '').toUpperCase();
        const colTypeParts = colType.split('|').map(part => part.trim());
        if (colTypeParts.includes('EX')) continue;
      }
      result.push(col);
    }
  }
  return result;
};

/**
 * colType에서 스키마 정보 추출
 */
const _parseColTypeSchema = (colType) => {
  if (!colType) return '\u0007STR';
  const colTypeParts = colType.toUpperCase().split('|').map(part => part.trim());
  const schema = [];
  
  if (colTypeParts.includes('PK')) schema.push('PK');
  if (colTypeParts.includes('NN')) schema.push('NN');
  if (colTypeParts.includes('EX')) schema.push('EX');
  if (colTypeParts.includes('RO')) schema.push('RO');

  const dataTypes = ['STR', 'INT', 'NUM', 'DATE', 'FLOAT', 'DECIMAL'];
  const dataType = colTypeParts.find(part => dataTypes.includes(part)) || 'STR';

  return schema.length > 0 ? `${schema.join('')}\u0007${dataType}` : `\u0007${dataType}`;
};

/**
 * 변경사항 초기화
 */
const clearChanges = () => {
    if (!datagrid.grid) return;
    SBGrid3.clearSaveData(datagrid.grid);
    updateChangeStatus();
};

/**
 * syncForm: 그리드 ↔ 폼 자동 동기화
 * - Grid → Form: 포커스 행 변경 시 폼 상태 업데이트
 * - Form → Grid: 폼 값 변경 시 그리드 셀 업데이트
 */
let syncFormWatcher = null;
let isSyncingFromGrid = false;

const syncRowToForm = (grid, rowItem) => {
    const syncForm = mergedSetting.value.syncForm;
    if (!syncForm || !syncForm.state) return;

    const formState = unref(syncForm.state);
    if (!formState) return;

    isSyncingFromGrid = true;
    try {
        if (syncForm.columns === 'all') {
            const gridColumns = computedGridConfig.value?.columns || [];
            const flatColumns = _flattenColumns(gridColumns);
            flatColumns.forEach(col => {
                if (col.field) {
                    const val = SBGrid3.getValue(grid, rowItem, col.field);
                    formState[col.field] = val !== undefined && val !== null ? val : '';
                }
            });
        } else if (Array.isArray(syncForm.columns)) {
            syncForm.columns.forEach(col => {
                const val = SBGrid3.getValue(grid, rowItem, col);
                formState[col] = val !== undefined && val !== null ? val : '';
            });
        }
    } finally {
        nextTick(() => { isSyncingFromGrid = false; });
    }
};

const clearSyncForm = () => {
    const syncForm = mergedSetting.value.syncForm;
    if (!syncForm || !syncForm.state) return;

    const formState = unref(syncForm.state);
    if (!formState) return;

    isSyncingFromGrid = true;
    try {
        Object.keys(formState).forEach(key => {
            formState[key] = '';
        });
    } finally {
        nextTick(() => { isSyncingFromGrid = false; });
    }
};

const setupSyncForm = () => {
    const syncForm = mergedSetting.value.syncForm;
    if (!syncForm || !syncForm.state) return;

    // 기존 watcher 정리
    if (syncFormWatcher) {
        syncFormWatcher();
        syncFormWatcher = null;
    }

    // Form → Grid (폼 값 변경 시 그리드 셀 업데이트)
    const stateSource = isRef(syncForm.state) ? syncForm.state : () => unref(syncForm.state);

    syncFormWatcher = watch(stateSource, (newVal) => {
        if (isSyncingFromGrid) return;
        if (!datagrid.grid) return;

        const focusRowKey = SBGrid3.getFocusedKey(datagrid.grid);
        if (!focusRowKey) return;

        const columns = syncForm.columns;
        const keys = columns === 'all' ? Object.keys(newVal) : (Array.isArray(columns) ? columns : []);

        keys.forEach(key => {
                SBGrid3.setValue(datagrid.grid, focusRowKey, newVal[key], key);
                console.log('syncForm', newVal[key], key);
        });
    }, { deep: true });
};

/**
 * focusData: 그리드 ↔ 외부 객체(Form Model) 양방향 동기화
 */
let focusDataWatcher = null;
let isSyncingFromGridToFocusData = false;

// Grid → focusData
const updateFocusData = (grid) => {
    const rowData = SBGrid3.getFocusedValue(grid); 

    if (!rowData) return;

    Object.assign(state.focusData, rowData);

    const externalFocusData = mergedSetting.value.focusData;
    if (externalFocusData && typeof externalFocusData === 'object') {
        isSyncingFromGridToFocusData = true;
        try {
            Object.assign(externalFocusData, rowData);
        } finally {
            nextTick(() => { isSyncingFromGridToFocusData = false; });
        }
    }
};

// focusData → Grid
const setupFocusDataSync = () => {
    const externalFocusData = mergedSetting.value.focusData;
    
    // focusData가 없거나 객체가 아니면 패스
    if (!externalFocusData || typeof externalFocusData !== 'object') return;

    // 기존 watcher 정리
    if (focusDataWatcher) {
        focusDataWatcher();
        focusDataWatcher = null;
    }

    // Vue 3의 watch는 reactive 객체를 바로 감시 가능
    // deep: true는 객체 내부 변경 감지
    focusDataWatcher = watch(() => externalFocusData, (newVal) => {
        if (isSyncingFromGridToFocusData) return;
        if (!datagrid.grid) return;

        const focusRowKey = SBGrid3.getFocusedKey(datagrid.grid);
        if (!focusRowKey) return;

        // 변경된 값만 그리드에 반영
        Object.keys(newVal).forEach(key => {
            const gridVal = SBGrid3.getValue(datagrid.grid, focusRowKey, key);
            if (gridVal !== newVal[key]) {
                SBGrid3.setValue(datagrid.grid, focusRowKey, newVal[key], key);
            }
        });
    }, { deep: true });
};

/**
 * 데이터 저장 메서드
 */
const save = async () => {
  if (!datagrid.grid) return;

  const defaultOnValueConvert = (field, value) => {
    if (typeof value === "string") {
        return value.replace(/'/g, "′");
    }
    return value;
  };

  // save가 없으면 dataQuery를 사용 (fallback)
  // path가 있는지 확인
  const saveConfig = (mergedSetting.value.save && mergedSetting.value.save.path) 
      ? mergedSetting.value.save
      : mergedSetting.value.dataQuery;

  if (!saveConfig || !saveConfig.path) {
      console.error("[CtvDataGrid] 저장 URL이 설정되지 않았습니다.");
      if (top.SetMessage) top.SetMessage("저장 URL이 설정되지 않았습니다.");
      return;
  }

  const url = saveConfig.path;
  const funcName = saveConfig.funcName || saveConfig.funcNm || "UfnSave";
  
  let bParam = [];
  if (typeof saveConfig.bParamBuilder === "function") {
      bParam = saveConfig.bParamBuilder({ state, props, setting: mergedSetting.value });
  } else if (typeof saveConfig.bParam === "function") {
      bParam = saveConfig.bParam({ state, props, setting: mergedSetting.value }); // legacy compatibility
  } else {
      bParam = saveConfig.bParam || [];
      // If bParam is not array but object? Usually array for .NET calls
      // If it's empty, maybe try to derive from logic? 
      // Legacy code defaults to empty array.
  }

  // dataQuery fallback 시 bParam 처리: dataQuery.params 사용
  if ((!bParam || bParam.length === 0) && saveConfig === mergedSetting.value.dataQuery) {
       // dataQuery의 params 재사용 (필터값 등)
      if (typeof mergedSetting.value.dataQuery.params === 'function') {
         // params가 함수인 경우... filterValues가 필요한데 여기서 구하기 어려움.
         // 하지만 보통 저장은 별도의 파라미터가 필요 없거나 row data에 의존함.
         // 공통 파라미터(gSInfo) 정도만 필요할 수 있음.
      }
  }
  // 기본적으로 bParam이 없으면 빈 배열로 진행. (필요 시 사용자 설정)

  const onValueCheck = saveConfig.onValueCheck;
  const onValueConvert = saveConfig.onValueConvert || defaultOnValueConvert;
  const reloadAfterSave = saveConfig.reloadAfterSave ?? true;

  try {
      // 1. 유효성 검사
      const failedData = SBGrid3.findInvalid(datagrid.grid);
      if (failedData?.rowItem !== undefined && failedData?.column !== undefined) {
          const msg = "필수 항목이 누락되었거나 형식이 맞지 않습니다. \n 수정한 뒤 다시 저장해 주세요.";
          
          if (typeof top.CtvModal?.alert === 'function') {
              await top.CtvModal.alert(msg, "검증 실패");
          } else {
              await ElMessageBox.alert(msg, '검증 실패', { type: 'warning' });
          }

          SBGrid3.moveFocus(datagrid.grid, failedData.rowItem, failedData.column);
          // SBGrid3.columnEditable missing in doc? Legacy code used it.
          // Assuming it puts cell in edit mode
          if (SBGrid3.columnEditable) SBGrid3.columnEditable(datagrid.grid, failedData.key, failedData.column);
          
          return null;
      }

      // 2. 변경 데이터 추출
      const saveDataResult = SBGrid3.getSaveData(datagrid.grid, true, true, true);
      
      const insertedData = saveDataResult?.inserted || [];
      const updatedData = saveDataResult?.updated || [];
      const deletedData = saveDataResult?.deleted || [];

      if (insertedData.length === 0 && updatedData.length === 0 && deletedData.length === 0) {
          const msg = "저장할 정보가 존재하지 않습니다.";
          if (typeof top.CtvModal?.alert === 'function') {
               await top.CtvModal.alert(msg);
          } else if (top.SetMessage) {
               top.SetMessage(msg);
          } else {
               await ElMessageBox.alert(msg, '알림', { type: 'info' });
          }
          return null;
      }

      // 3. 전송 데이터 구성 (aSaveData)
      const aSaveData = [];
      const headerInfo = { ROW: "RowNum", FLAG: String.fromCharCode(7) };
      
      const columns = computedGridConfig.value?.columns || [];
      const flattenedColumns = _flattenColumns(columns, false);
      
      // saveSchema? Legacy used `this.saveSchema`. 
      // In Vue, maybe pass it via config? For now use colType schema parsing fallback.
      flattenedColumns.forEach(col => {
          const field = col.field;
          if (!field || field.startsWith("_")) return;
          
          const schema = _parseColTypeSchema(col.colType);
          headerInfo[field] = field + String.fromCharCode(7) + schema;
      });
      aSaveData.push(headerInfo);

      let rowNum = 1;
      const processRow = (row, flag) => {
          const rowInfo = { ROW: rowNum++, FLAG: flag };
          for (const col of flattenedColumns) {
              const field = col.field;
              if (!field || field.startsWith("_")) continue;

              let val = row[field];
              if (val === undefined || val === null) val = "";

              if (typeof onValueCheck === 'function') {
                  const errorMsg = onValueCheck(field, val, row);
                  if (errorMsg) return { error: errorMsg };
              }

              val = onValueConvert(field, val);
              rowInfo[field] = val;
          }
          return rowInfo;
      };

      const processDataArray = async (dataArray, flag) => {
          for (const row of dataArray) {
              const result = processRow(row, flag);
              if (result && result.error) {
                   await ElMessageBox.alert(result.error, '오류', { type: 'error' });
                   return false;
              }
              aSaveData.push(result);
          }
          return true;
      };

      if (!(await processDataArray(insertedData, "N"))) return null;
      if (!(await processDataArray(updatedData, "U"))) return null;
      if (!(await processDataArray(deletedData, "D"))) return null;

      // 4. API 호출
      const loading = ElLoading.service({
          lock: true,
          text: '데이터 저장중 입니다.',
      });

      let result;
      try {
          // Global function checks
          if (typeof window.ufnXhrDotNetCaller04 === 'function') {
               // ufnXhrDotNetCaller04(bAsync, sUrl, sFunc, bParam, sParam)
               result = await window.ufnXhrDotNetCaller04(true, url, [funcName, ""], bParam, aSaveData);
          } else if (typeof window.ufnXhrDotNetCaller01 === 'function') {
               result = await window.ufnXhrDotNetCaller01(true, url, bParam, aSaveData);
          } else {
               console.error("[CtvDataGrid] 저장 함수(ufnXhrDotNetCaller)를 찾을 수 없습니다.");
               return null;
          }

          if (!result) {
               throw new Error("서버 응답 없음");
          }

          if (result.ErrorCode && result.ErrorCode !== "") {
               if (top.mwPop09Open) top.mwPop09Open(result, result.ErrorCode);
               if (saveConfig.onError) saveConfig.onError(result);
               return result;
          }

          // 5. 성공 처리
          await ElMessageBox.alert("정상적으로 저장처리 되었습니다.", '성공', { type: 'success' });dd

          if (saveConfig.onSuccess) {
               await saveConfig.onSuccess(result);
          }
      } finally {
          loading.close();
      }

      if (reloadAfterSave) {
          await query(); // Reload data (shows its own loading)
      } else {
          // 리로드 안하면 변경 상태 초기화 (저장 완료했으므로)
          // 하지만 API 호출 후 서버 데이터와 동기화되지 않은 상태일 수 있으므로 주의.
          // 보통 저장이 성공하면 변경 플래그를 내리는 것이 맞음.
          // SBGrid3 상태도 초기화 필요할 수 있음 (commit 등)
          // SBGrid3.setEmptyModified? 문서 확인 필요. 
          // 보통 다시 로드하는 것이 가장 안전.
          // 여기서는 hasChanges만 false로 설정.
          hasChanges.value = false;
      }

      return result;

  } catch (err) {
      console.error("[CtvDataGrid] 저장 중 오류:", err);
      if (saveConfig.onError) saveConfig.onError(err);
      else if (top.SetMessage) top.SetMessage("저장 중 오류가 발생했습니다.");
      // throw err; // Don't crash UI
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

// 활성 상태 관리
const isActive = ref(false);

const handleActive = async () => {
    const group = mergedSetting.value.group;
    const id = mergedSetting.value.id;
    
    if (!group || !id) return;

    // 이미 활성화된 상태면 패스
    if (isActive.value) return;

    const prevActive = componentRegistry.getActive(group);
    
    // 이전 활성 그리드가 있고, 자신이 아니며, 변경사항이 있는 경우
    if (prevActive && prevActive.id !== id && prevActive.hasChanges) {
        try {
            await ElMessageBox.confirm(
                '변경사항이 있습니다. 저장하시겠습니까?',
                '확인',
                {
                    confirmButtonText: '저장',
                    cancelButtonText: '저장 안 함',
                    distinguishCancelAndClose: true,
                    type: 'warning',
                    closeOnClickModal: false,
                    closeOnPressEscape: true
                }
            );
            
            // 저장 (Confirm)
            if (prevActive.save) {
                const saveResult = await prevActive.save();
                // 저장이 성공(결과 반환)했는지 확인. save returns null on validation fail or empty.
                // But if validation fail, we should probably stay.
                // If update successful, we proceed.
                if (saveResult) {
                    componentRegistry.setActive(group, id);
                }
            } else {
                 // save fn missing? proceed
                 componentRegistry.setActive(group, id);
            }

        } catch (action) {
            if (action === 'cancel') {
                // 저장 안 함 (Discard)
                if (prevActive.clearChanges) {
                    prevActive.clearChanges();
                }
                componentRegistry.setActive(group, id);
            } else {
                // 취소 (Close/Esc) -> 유지
                // do nothing
                // Focus handling? If focus is already in new grid, logic says "maintain active grid".
                // Visually border remains on old grid. 
                // Optionally return focus to old grid:
                // if (prevActive.setFocus) prevActive.setFocus();
            }
        }
    } else {
        // 변경사항 없으면 바로 활성화
        componentRegistry.setActive(group, id);
    }
};

onMounted(async () => {
  // Initial creation if config is ready
  if (computedGridConfig.value) {
      await createGrid();
  }
  
  // 컴포넌트 레지스트리에 등록
  if (mergedSetting.value.id) {
    componentRegistry.register(mergedSetting.value.id, {
      group: mergedSetting.value.group,
      query,
      setData,
      datagrid,
      save,
      clearChanges, // Expose clearChanges
      getRowStatus,
      state, // Expose reactive state directly
      // getters
      get hasChanges() { return hasChanges.value; },
      get isLoaded() { return state.isLoaded; },
      get totalRows() { return state.totalRows; },
      get selectedRowIdx() { return state.selectedRowIdx; },
      get focusData() { return state.focusData; },
      get focusStatus() { return state.focusStatus; },
      // active state helper
      setActive: (active) => { isActive.value = active; }  
    });
    
    // 전역 window 객체에 그리드 인스턴스 노출 (레거시/외부 접근용)
    if (mergedSetting.value.id) {
        window[mergedSetting.value.id] = componentRegistry.get(mergedSetting.value.id);
    }

    // 첫 번째 등록된 그리드라면 기본 활성화
    const group = mergedSetting.value.group;
    if (group) {
        // 그룹 이벤트 구독
        componentRegistry.subscribe(group, (activeId) => {
            isActive.value = (activeId === mergedSetting.value.id);
        });

        const active = componentRegistry.getActive(group);
        if (!active) {
            componentRegistry.setActive(group, mergedSetting.value.id);
        } else {
             // 이미 활성화된 컴포넌트가 있으면 상태 동기화
             isActive.value = (active.id === mergedSetting.value.id);
        }
    }

    // 전역 변수로 등록 (window.grid1 등)
    if (typeof window !== 'undefined') {
        window[mergedSetting.value.id] = componentRegistry.get(mergedSetting.value.id);
    }
  }
});

onBeforeUnmount(() => {
  // syncForm watcher 정리
  if (syncFormWatcher) {
    syncFormWatcher();
    syncFormWatcher = null;
  }

  // focusData watcher 정리
  if (focusDataWatcher) {
    focusDataWatcher();
    focusDataWatcher = null;
  }

  // 컴포넌트 레지스트리에서 제거
  if (props.id) {
    componentRegistry.unregister(props.id);
    // 전역 변수 해제
    if (typeof window !== 'undefined' && window[props.id]) {
        delete window[props.id];
    }
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
  if (datagrid.grid && typeof SBGrid3.destroy === 'function') {
    SBGrid3.destroy(datagrid.grid);
  }
});

// 외부에서 접근 가능한 메서드 노출
defineExpose({
  setData,
  datagrid,
  save,
  hasChanges,
  state
});
</script>

<style scoped>
.ctv-data-grid {
  width: 100%;
  height: 100%;
  border: 1px solid transparent; /* 기본 테두리 */
  box-sizing: border-box;
}
</style>
