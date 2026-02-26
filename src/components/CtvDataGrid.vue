<template>
  <div 
    class="ctv-data-grid" 
    :class="{ 'is-active': isActive }"
    @click="handleGridClick"
  >
    <div ref="gridContainer"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, markRaw, nextTick, unref, isRef, h } from 'vue';
import { ElMessageBox, ElLoading, ElTable, ElTableColumn } from 'element-plus';
import { pendingUploads } from '../utils/pendingUploads.js';
import { useFileUpload } from '../composables/useFileUpload.js';
import { 
  getDefaultGridConfig, 
  getEditableGridConfig,
  applyColTypeToColumns,
  applyLockTypeToColumns,
  applyDefaultUnitToColumns,
  parseTreeColumns,
  _getEditable
} from '../utils/gridUtils.js';
import { activeGridId } from '../utils/common.js';
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
const sbgrid = computed(() => datagrid.grid);

/**
 * Props와 Setting 병합된 최종 설정
 */
const mergedSetting = computed(() => {
  const settings = props.setting || {};
  
  // 공통 권한 체크 함수 사용
  const defaultEditable = _getEditable();

  return {
    gridConfig: props.gridConfig || settings.gridConfig,
    editable: props.editable !== undefined ? props.editable : (settings.editable !== undefined ? settings.editable : defaultEditable),
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
    // focusRow -> focusData 명칭 통일
    focusData: settings.focusData || settings.focusRow || null, // 통합된 단일 동기화 대상
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

  // 데이터 로드 시 변경 상태 초기화
  hasChanges.value = false;

  // 데이터가 비어있으면 focusRow 초기화
  if (gridData.length === 0) {
    clearFocusData();
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
  focusStatus: null, // 포커스된 행의 상태
  focusData: null,
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
    // 중첩된 그룹 columns(예: '대상자' 안의 하위 컬럼들)도 재귀적으로 검사
    const hasUnloadedCombo = (cols) => {
        if (!Array.isArray(cols)) return false;
        for (const col of cols) {
            const combo = col.inputCombo || col.combo;
            if (Array.isArray(combo) && combo.length === 0 && !combo.__loaded) {
                return true;
            }
            // 중첩된 columns가 있으면 재귀 탐색
            if (col.columns && Array.isArray(col.columns) && col.columns.length > 0) {
                if (hasUnloadedCombo(col.columns)) return true;
            }
        }
        return false;
    };

    if (config.columns && Array.isArray(config.columns)) {
        if (hasUnloadedCombo(config.columns)) {
            return null;
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

  if (!gridContainer.value) {
    await nextTick();
    if (!gridContainer.value) {
        console.warn("[CtvDataGrid] DOM 컨테이너(gridContainer)가 준비되지 않아 그리드 생성을 대기합니다.");
        return;
    }
  }

  // 기존 그리드 파괴 (재생성 시)
  if (datagrid.grid && typeof SBGrid3.destroy === 'function') {
    SBGrid3.destroy(datagrid.grid);
    datagrid.grid = null;
    state.datagrid = null;
  }

  // focusData watcher 관련 로직 (필요시)
  // if (focusDataWatcher) ...

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
       // parseTreeColumns: 일반 컬럼은 그대로, 그룹 컬럼만 SBGrid3 다중헤더 형식으로 변환
       const treeParsed = parseTreeColumns(finalConfig.columns);

       // 혼합 배열: 일반 컬럼({ field, ... }) or 그룹 객체({ columns, captions, rows })
       const processedColumns = treeParsed.columns.map(item => {
           if (Array.isArray(item.columns)) {
               // 그룹 컬럼: 내부 리프 컬럼들에 colType/lockType 처리 적용
               let innerCols = applyColTypeToColumns(item.columns);
               innerCols = applyLockTypeToColumns(innerCols, () => datagrid.grid);
               if (finalConfig.defaultUnit !== undefined) {
                   innerCols = applyDefaultUnitToColumns(innerCols, finalConfig.defaultUnit);
               }
               return { ...item, columns: innerCols };
           } else {
               // 일반 컬럼: 바로 처리
               return item;
           }
       });

       // 일반 컬럼들에 colType/lockType 처리 (한번에)
       let flatResult = applyColTypeToColumns(processedColumns.filter(c => !Array.isArray(c.columns)));
       flatResult = applyLockTypeToColumns(flatResult, () => datagrid.grid);
       if (finalConfig.defaultUnit !== undefined) {
           flatResult = applyDefaultUnitToColumns(flatResult, finalConfig.defaultUnit);
           delete finalConfig.defaultUnit;
       }

       // 혼합 배열 재조합: 순서 유지 (원본 인덱스 기준)
       let flatIdx = 0;
       finalConfig.columns = processedColumns.map(item => {
           if (Array.isArray(item.columns)) {
               return item; // 그룹 — 이미 처리됨
           } else {
               return flatResult[flatIdx++]; // 일반 컬럼 — 순서대로
           }
       });
    }


    // ===== 컨테이너 설정 =====
    finalConfig.container = gridContainer.value;

    // ===== 기본 설정 병합 =====
    const defaultConfig = getDefaultGridConfig({ showRowDetailModal });
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
    
    if (mergedSetting.value.editable !== false && finalConfig.editable !== false) {
      const editableConfig = getEditableGridConfig({ showRowDetailModal, pasteClipboardData });

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
        
        // 전역 activeGridId 업데이트 (포커스된 그리드 ID 저장)
        if (props.id) {
            activeGridId.value = props.id;
        }

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
        state.focusData = value;

        // 3-1. 포커스된 행 상태 업데이트
        if (focusedRow) {
            state.focusStatus = focusedRow.status;
        } else {
            state.focusStatus = null;
        }

        // 4. 행 인덱스가 변경되었는지 확인
        const rowIndexChanged = currentRowIndex !== null &&
            (state.lastFocusedRowIndex === null || currentRowIndex !== state.lastFocusedRowIndex);

        // 5. rowChange 이벤트 호출
        if (rowIndexChanged && value && originalRowChange && typeof originalRowChange === "function") {
            originalRowChange(grid, value);
        }

        // 5-1. Grid → focusData (행 변경 시 동기화)
        if (rowIndexChanged && focusedRow) {
            updateFocusData(grid, focusedRow);
        }

        // 6. 현재 행 인덱스 저장
        state.lastFocusedRowIndex = currentRowIndex;
        state.selectedRowIdx = currentRowIndex !== null ? currentRowIndex : -1;

        // 7. 원래 focus 이벤트 호출
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

    SBGrid3.LogLevel = 4;

    // ===== 변경 감지 이벤트 등록 =====
    SBGrid3.setDoCommand(datagrid.grid, 'updated', (grid, command) => {
        updateChangeStatus();
    });

    // 그리드 클릭 시 활성 그리드 ID 업데이트 (행 포커스 여부와 무관하게 동작)
    SBGrid3.setDoCommand(datagrid.grid, 'event', (grid, command) => {
      if(command.event.type === 'click') {
        if (props.id) {
            activeGridId.value = props.id;
        }
      }
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
             // 현재 브라우저의 포커스가 그리드 외부에 있는 경우(예: 폼 입력 중) 포커스를 뺏지 않음
             const isFocusInGrid = gridContainer.value?.contains(document.activeElement);

             // autoFocus가 강제(true)가 아니면, 이미 다른 곳에 포커스가 있을 때 뺏지 않음
             if (mergedSetting.value.autoFocus !== true) {
                 if (state.isLoaded && !isFocusInGrid && document.activeElement !== document.body) {
                     return;
                 }
             }

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

    // ===== focusData 양방향 동기화 설정 =====
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
async function query(ignoreChanges = false) {
  if (!ignoreChanges && hasChanges.value) {
      try {
          await ElMessageBox.confirm(
              '변경사항이 있습니다. 저장하시겠습니까?',
              '확인',
              {
                  confirmButtonText: '확인',
                  cancelButtonText: '저장 안 함',
                  distinguishCancelAndClose: true,
                  type: 'warning'
              }
          );
          
          // 확인: 저장 후 조회
          await save();
          return;
      } catch (action) {
          if (action === 'cancel') {
              // 취소: 그냥 조회 (진행)
          } else {
              // 닫기/Esc: 중단
              return;
          }
      }
  }

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

    // 데이터 설정: data[dataPath]가 undefined/null이 아니면 항상 setData 호출
    // (빈 배열 []도 정상적인 '데이터 없음' 결과이므로 반드시 setData로 그리드를 클리어해야 함)
    if (data && data[dataPath] !== undefined && data[dataPath] !== null) {
      await setData(data[dataPath]);
    } else if (data) {
      // dataPath 키가 응답에 존재하지 않는 경우 빈 배열로 클리어
      console.warn(`[CtvDataGrid] dataPath '${dataPath}' 가 응답에 없습니다. 그리드를 클리어합니다.`);
      await setData([]);
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
    // col.columns가 있으면 재귀적으로 탐색 (SBGrid3 다중 헤더 또는 그룹 구조 대응)
    if (Array.isArray(col.columns) && col.columns.length > 0) {
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
 * focusData: 그리드 ↔ Form 양방향 동기화 (통합 솔루션)
 * - Grid → focusData: 포커스 행 변경 시 focusData 업데이트
 * - focusData → Grid: focusData 값 변경 시 그리드 셀 업데이트
 */
let focusDataWatcher = null; // previously focusRowWatcher
let isSyncing = false; // 단일 플래그로 무한루프 방지
let handleFormFieldBlur = null; // 폼 필드 blur 이벤트 핸들러 (cleanup용)

/**
 * Grid → focusData (포커스된 행 데이터를 focusData에 복사)
 */
const updateFocusData = (grid, rowItem) => {
    const focusData = mergedSetting.value.focusData;
    if (!focusData || typeof focusData !== 'object') return;

    isSyncing = true;
    try {
        const rowData = SBGrid3.getFocusedValue(grid);
        if (!rowData) return;

        // 양방향 동기화를 위한 현재 데이터 스냅샷 저장
        state.focusData = { ...rowData };

        Object.keys(rowData).forEach(key => {
            const newVal = rowData[key] !== undefined && rowData[key] !== null ? rowData[key] : '';
            if (focusData[key] !== newVal) {
                focusData[key] = newVal;
            }
        });

    } finally {
        nextTick(() => { 
            isSyncing = false;
            // 폼 유효성 검증 마크 지우기 위한 이벤트
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ctv-grid-focus-data-changed', {
                    detail: { focusData }
                }));
            }
        });
    }
};

/**
 * focusData 초기화 (데이터 없을 때)
 */
const clearFocusData = () => {
    const focusData = mergedSetting.value.focusData;
    if (!focusData || typeof focusData !== 'object') return;

    isSyncing = true;
    try {
        state.focusData = null; // 스냅샷 초기화
        
        Object.keys(focusData).forEach(key => {
            if (focusData[key] !== '') {
                focusData[key] = '';
            }
        });
    } finally {
        nextTick(() => { 
            isSyncing = false;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ctv-grid-focus-data-changed', {
                    detail: { focusData }
                }));
            }
        });
    }
};

/**
 * focusData → Grid 수동 동기화 (필드 blur 시 호출)
 */
const syncFormToGrid = () => {
    const focusData = mergedSetting.value.focusData;
    if (isSyncing || !datagrid.grid || !focusData) return;

    const targetRowIndex = state.lastFocusedRowIndex;
    
    // 초기 로딩 시 or 포커스 없는 경우
    if (targetRowIndex === null || targetRowIndex === undefined) return;

    // 현재 포커스 데이터 스냅샷 (이전 포커스 시점의 데이터)
    const gridSnapshot = state.focusData;

    // 스냅샷이 없으면 중단 (안전장치)
    if (!gridSnapshot) return;

    isSyncing = true;
    try {
        Object.keys(focusData).forEach(key => {
            // 비교 대상: Grid의 원래 데이터(스냅샷) vs Form의 현재 데이터
            // 주의: gridSnapshot은 포커스 진입 시점의 데이터이므로, 
            // 사용자가 수정한 form 데이터와 비교하여 변경된 것만 반영
            const currentGridVal = String(gridSnapshot[key] ?? '');
            const newValStr = String(focusData[key] ?? '');

            if (currentGridVal !== newValStr) {
                // 변경사항 반영 (대상 행: targetRowIndex)
                SBGrid3.setRowValue(datagrid.grid, key, focusData[key], targetRowIndex);
                
                // 연속된 변경을 위해 로컬 스냅샷도 갱신 (선택사항이나 권장)
                gridSnapshot[key] = focusData[key];
            }
        });
    } finally {
        nextTick(() => { isSyncing = false; });
    }
};

/**
 * focusData ↔ Grid 양방향 동기화 설정
 */
function setupFocusDataSync() {
    // watch 제거: 실시간 동기화 대신 blur 이벤트 기반으로 동작
    // syncFormToGrid는 필드 blur 시 수동 호출됨
};

/**
 * 데이터 저장 메서드
 */
async function save(reload = true) {
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
  const reloadAfterSave = (saveConfig.reloadAfterSave ?? true) && reload;

  try {
      let failedData = { key: undefined, column: undefined };

      // 1. 유효성 검사
      failedData = SBGrid3.findInvalid(datagrid.grid, failedData.key, failedData.column);
      
      if (failedData?.rowItem !== undefined && failedData?.column !== undefined) {
          const msg = "필수 항목이 누락되었거나 형식이 맞지 않습니다. \n 수정한 뒤 다시 저장해 주세요.";
          await ElMessageBox.alert(msg, '검증 실패', { type: 'warning' });

          SBGrid3.moveFocus(datagrid.grid, failedData.rowItem, failedData.column);
          SBGrid3.columnEditable(datagrid.grid, failedData.key, failedData.column);
          
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

      // 3-1. deferUpload 대기 중인 파일 처리 (Binary 업로드)
      const uploadedFileTasks = []; // DB 저장 실패 시 롤백(삭제)하기 위한 기록
      const rollbackUploadedFiles = async (tasks) => {
          if (tasks.length === 0) return;
          const { deleteFile } = useFileUpload();
          for (const task of tasks) {
              try {
                  const delCfg = {
                      ...task.uploadConfig,
                      deleteAshxUrl: task.uploadConfig.ashxUrl || 'FileUpLoad.ashx',
                      deleteAction:  task.uploadConfig.action || '',
                      folder2: task.uploadConfig.folder2,
                      folder3: task.uploadConfig.folder3,
                  };
                  await deleteFile(task.filename, delCfg, task.focusData);
              } catch(e) {
                  console.warn("[CtvDataGrid] 롤백 - 파일 삭제 실패", task.filename, e);
              }
          }
      };

      if (!pendingUploads.isEmpty()) {
        const pending = pendingUploads.flushAll();
        const { upload } = useFileUpload();

        for (const [field, { file, uploadConfig, focusData }] of pending.entries()) {
          try {
            // FileUploadApi.ashx 에 파일 업로드(Binary) → 실제 저장된 파일명 받음
            const uploadCfg = {
              ...uploadConfig,
              ashxUrl: uploadConfig.ashxUrl || '../../cwwsCom/NewFileUpload/FileUploadApi.ashx',
            };
            const result = await upload(file, uploadCfg, focusData);
            const serverFileName = result.NM_FILE;
            
            uploadedFileTasks.push({ filename: serverFileName, uploadConfig: uploadCfg, focusData });

            // ① 헤더(aSaveData[0])에 필드 없으면 추가 → SetMakeQuery가 SQL에 포함
            if (!(field in aSaveData[0])) {
              aSaveData[0][field] = field + String.fromCharCode(7) + 'S:0:500';
            }

            // ② 데이터 행에 실제 파일명 주입 (삭제 행 제외)
            for (let i = 1; i < aSaveData.length; i++) {
              if (aSaveData[i].FLAG === 'D') continue;
              aSaveData[i][field] = serverFileName;
            }
          } catch (err) {
            console.error(`[CtvDataGrid] 파일 업로드 실패 (field: ${field})`, err);
            // 여태 성공한 업로드 파일 모두 삭제
            await rollbackUploadedFiles(uploadedFileTasks);
            await ElMessageBox.alert(
              `파일 업로드 중 오류가 발생했습니다.\n${err.message || ''}`,
              '업로드 오류',
              { type: 'error' }
            );
            return null;
          }
        }
      }

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
               await rollbackUploadedFiles(uploadedFileTasks); // 안전장치: DB 실패 시 물리 파일 정리
               if (top.mwPop09Open) top.mwPop09Open(result, result.ErrorCode);
               if (saveConfig.onError) saveConfig.onError(result);
               return result;
          }

          // 5. 성공 처리
          await ElMessageBox.alert("저장되었습니다.", '성공', { type: 'success' });

          if (saveConfig.onSuccess) {
               await saveConfig.onSuccess(result);
          }
      } finally {
          loading.close();
      }

      if (reloadAfterSave) {
          await query(true); // Reload data (shows its own loading)
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
      if (uploadedFileTasks && uploadedFileTasks.length > 0) {
          await rollbackUploadedFiles(uploadedFileTasks).catch(() => {}); // catch 내의 예외는 무시
      }
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

// Watch configuration changes to rebuild grid (Only for initial creation)
watch(computedGridConfig, async (newVal) => {
  if (newVal && !datagrid.grid) {
      await createGrid();
  }
}, { immediate: true, flush: 'post' });

// 활성 상태 관리
const isActive = computed(() => {
    // 그룹이 없는 단일 그리드는 항상 활성 상태 표시
    if (!mergedSetting.value.group) {
        return true;
    }
    // 그룹이 있는 경우 activeGridId와 비교
    return activeGridId.value === mergedSetting.value.id;
});

// activeGridId를 관찰하여 변경되면 componentRegistry 업데이트
watch(activeGridId, (newId) => {
    if (newId && newId === mergedSetting.value.id && mergedSetting.value.group) {
        componentRegistry.setActive(mergedSetting.value.group, newId);
    }
}, { immediate: true });

// 페이지 이탈 시 변경사항 확인 (beforeunload)
const handleBeforeUnload = (e) => {
    if (hasChanges.value) {
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 동작: 기본 경고창 표시
    }
};

/**
 * 전역 블러 체크 설정 (mousedown 캡처링)
 * 레거시 ctv-DataGrid.js의 _setupBlurCheck 로직 이식
 */
const setupGlobalBlurCheck = () => {
    if (typeof document === 'undefined') return;
    // 전역 플래그로 중복 등록 방지 (컴포넌트 인스턴스마다 실행되는 것 방지)
    if (window.__ctv_global_blur_check_setup__) return;
    
    window.__ctv_global_blur_check_setup__ = true;
    let isProcessing = false;

    document.addEventListener('mousedown', async (e) => {
        // 이미 처리 중이거나 재발송된 이벤트면 무시
        if (isProcessing || e.isCtvRedispatched) return;

        // 클릭된 요소가 어떤 그리드에 속하는지 확인
        const allComponents = Array.from(componentRegistry.getAll().values());
        
        // 클릭된 Grid 찾기
        const clickedGridInst = allComponents.find(comp => {
            return comp.container && comp.container.contains(e.target);
        });

        // 클릭된 곳이 그리드가 아니면 무시
        if (!clickedGridInst) return;

        // 그룹 확인
        const group = clickedGridInst.group;
        if (!group) return;

        // 현재 그룹의 활성 그리드 확인
        const activeGridInst = componentRegistry.getActive(group);
        
        // 활성 그리드가 없거나, 클릭된 그리드가 이미 활성 그리드라면 패스
        if (!activeGridInst || activeGridInst.id === clickedGridInst.id) {
            componentRegistry.setActive(group, clickedGridInst.id);
            return;
        }

        // 활성 그리드에 변경사항이 있는지 확인
        if (!activeGridInst.hasChanges) {
            componentRegistry.setActive(group, clickedGridInst.id);
            return;
        }

        // === 변경사항 있음: 이벤트 차단 및 컨펌 ===
        e.preventDefault();
        e.stopPropagation();
        isProcessing = true;

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
            if (activeGridInst.save) {
                await activeGridInst.save();
                componentRegistry.setActive(group, clickedGridInst.id);
                reDispatchEvent(e);
            } else {
                 componentRegistry.setActive(group, clickedGridInst.id);
                 reDispatchEvent(e);
            }

        } catch (action) {
            if (action === 'cancel') {
                // 저장 안 함 (Discard)
                if (activeGridInst.clearChanges) activeGridInst.clearChanges();
                componentRegistry.setActive(group, clickedGridInst.id);
                reDispatchEvent(e);
            }
            // 취소 (Close/Esc) -> 유지 (이벤트는 이미 차단됨)
        } finally {
            isProcessing = false;
        }

    }, true); // Use Capture Phase
};

/**
 * 이벤트 재발송 헬퍼
 * mousedown 이벤트 외에 mouseup, click 이벤트도 시뮬레이션하여 발송
 */
const reDispatchEvent = (originalEvent) => {
    const target = originalEvent.target;
    if (!target) return;

    const eventTypes = ['mousedown', 'mouseup', 'click'];

    eventTypes.forEach(type => {
        const newEvent = new MouseEvent(type, {
            bubbles: originalEvent.bubbles,
            cancelable: originalEvent.cancelable,
            view: originalEvent.view,
            detail: originalEvent.detail,
            screenX: originalEvent.screenX,
            screenY: originalEvent.screenY,
            clientX: originalEvent.clientX,
            clientY: originalEvent.clientY,
            ctrlKey: originalEvent.ctrlKey,
            altKey: originalEvent.altKey,
            shiftKey: originalEvent.shiftKey,
            metaKey: originalEvent.metaKey,
            button: originalEvent.button,
            buttons: originalEvent.buttons,
            relatedTarget: originalEvent.relatedTarget
        });

        // 재발송 플래그 설정 (무한루프 방지)
        newEvent.isCtvRedispatched = true;

        target.dispatchEvent(newEvent);
    });
};

/**
 * 행 추가 (defaultValue 옵션 적용)
 * @param {Object} data - 추가할 데이터 (defaultValue와 병합됨)
 */
const addRow = (data) => {
    if (!datagrid.grid) return;

    // 기본값 처리 (함수 또는 객체)
    let defaultVal = mergedSetting.value.defaultValue;
    if (typeof defaultVal === 'function') {
        const publicGrid = { datagrid: datagrid.grid };
        defaultVal = defaultVal(publicGrid, state);
    }
    
    // 데이터 병합 (입력 데이터가 우선)
    const rowData = { ...(defaultVal || {}), ...(data || {}) };
    // 현재 포커스된 행 찾기
    const focusedRow = SBGrid3.getFocusedRow(datagrid.grid);
    // focusedRow가 있으면 해당 행 뒤에 추가 (key 전달), 없으면 맨 뒤(null)에 추가
    const key = focusedRow ? focusedRow._key : null;
    
    // 레거시 호환: appendRow 사용
    if (typeof SBGrid3.appendRow === 'function') {
        SBGrid3.appendRow(datagrid.grid, key, rowData);
    } else if (typeof SBGrid3.insertRow === 'function') {
         // insertRow가 key를 받는지 index를 받는지 불확실하지만, 
         // 보통 key 기반이면 key를, index 기반이면 index를 넘겨야 함.
         // SBGrid3는 보통 insertRow(grid, key, data) 형태임.
         SBGrid3.insertRow(datagrid.grid, key, rowData);
    } else {
        console.warn('[CtvDataGrid] SBGrid3.appendRow 또는 insertRow 메서드가 없습니다.');
    }
    
    // 상태 업데이트
    updateChangeStatus();
};

/**
 * 행 삭제
 */
const deleteRow = () => {
    if (!datagrid.grid) return;
    
    const focusedRow = SBGrid3.getFocusedRow(datagrid.grid);
    if (focusedRow) {
        SBGrid3.deleteRow(datagrid.grid, focusedRow._key);
        updateChangeStatus();
        
        // 삭제 후 상태 초기화
        state.selectedRowIdx = -1;
        state.focusStatus = null;
        state.focusData = null;
    }
};

/**
 * 행 정보 보기 모달 표시
 */
function showRowDetailModal(grid, column, rowItem) {
    if (!grid || !rowItem) return;
    
    // 컬럼 정보 가져오기 (평탄화하여 모든 리프 컬럼 추출)
    const allColumns = SBGrid3.getColumns(grid);
    const columns = _flattenColumns(allColumns);
    const data = rowItem;

    // 테이블 데이터 생성
    const tableData = [];
    columns.forEach(col => {
        // 시스템 컬럼 및 병합용 더미 컬럼 제외
        if (!col.field || col._name === 'RowNoColumn1' || col.type === 'check' || col.field.startsWith('MERGE_DUMMY')) return;
        
        // 1. Caption
        let caption = col.caption;
        if (Array.isArray(caption)) caption = caption[0];
        if (!caption) caption = col.field;
        
        // 2. Value
        let value = data?.data?.[col.field] ?? "";
        if (value === undefined || value === null) value = '';

        // 3. Key (Constraint)
        const colType = (col.colType || '').toUpperCase();
        const keys = [];
        if (colType.includes('PK') || col.isPrimaryKey) keys.push('PK');
        if (colType.includes('NN') || col.required) keys.push('NN');
        if (colType.includes('EX') || col.saveExclude) keys.push('EX');
        const keyStr = keys.join(', ');

        // 4. Data Type
        let dataType = col.dataType || 'string';
        if (colType.includes('NUM') || colType.includes('NUMBER')) dataType = 'number';
        else if (colType.includes('DATE')) dataType = 'date';
        
        // 5. Hidden
        // SBGrid3 hidden 속성, visible 속성, colType H 체크
        const colTypeHidden = colType.split('|').map(s => s.trim()).some(x => ['H', 'HIDE', 'HIDDEN'].includes(x));
        const isHidden = col.hidden === true || col.visible === false || colTypeHidden;

        // 6. Format
        const format = col.formatType || col.format || '';
        
        tableData.push({ 
            caption, 
            field: col.field, 
            key: keyStr, 
            dataType, 
            hidden: isHidden ? 'true' : 'false', 
            format, 
            value 
        });
    });

    // VNode 생성 (ElTable 사용)
    const vnode = h('div', { style: 'display: flex; flex-direction: column; width: 100%;' }, [
        h(ElTable, { 
            data: tableData, 
            border: true, 
            maxHeight: '450px',
            style: 'width: 100%;',
            fit: true,
            showHeader: true,
            size: 'small',
            'header-cell-style': { background: '#f5f7fa', color: '#606266', textAlign: 'center', fontWeight: 'bold' },
        }, {
            default: () => [
                h(ElTableColumn, { prop: 'caption', label: 'Caption', width: '120', fixed: true }),
                h(ElTableColumn, { prop: 'field', label: 'Field', width: '120' }),
                h(ElTableColumn, { prop: 'key', label: 'Key', width: '60', align: 'center' }),
                h(ElTableColumn, { prop: 'dataType', label: 'Data Type', width: '90', align: 'center' }),
                h(ElTableColumn, { prop: 'hidden', label: 'Hidden', width: '70', align: 'center' }),
                h(ElTableColumn, { prop: 'format', label: 'Format', width: '80', align: 'center' }),
                h(ElTableColumn, { prop: 'value', label: 'Data Value', minWidth: '100' })
            ]
        })
    ]);
    
    ElMessageBox({
        title: '행 정보',
        message: vnode,
        confirmButtonText: '닫기',
        customClass: 'ctv-row-detail-modal',
        draggable: true,
    });
};

/**
 * 클립보드 데이터 붙여넣기 (현위치에 추가)
 */
async function pasteClipboardData() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;

        // 개행 문자로 분리 (마지막 빈 줄 제거)
        const rows = text.split(/\r?\n/);
        if (rows.length > 0 && rows[rows.length - 1].trim() === '') {
            rows.pop();
        }
        if (rows.length === 0) return;

        // 현재 포커스 위치
        const focusedRow = SBGrid3.getFocusedRow(datagrid.grid);
        const key = focusedRow ? focusedRow._key : null; 
        
        // 컬럼 정보 가져오기 (매핑용 - visible 컬럼만)
        const columns = SBGrid3.getColumns(datagrid.grid).filter(col => 
            col.field && // field가 있는 데이터 컬럼만 대상
            !col.hidden && 
            col.type !== 'check' && 
            col._name !== 'RowNoColumn1' &&
            col.type !== 'status' && // 상태 컬럼 제외
            col.visible !== false 
        );
        
        // 역순으로 순회하며 insertRow (key 바로 뒤에 계속 추가하면 순서가 뒤집히므로, 역순 데이터를 key 뒤에 넣으면 정순이 됨)
        // 예: [A, B, C] -> C 넣음 -> B 넣음 -> A 넣음 => [key, A, B, C]
        for (let i = rows.length - 1; i >= 0; i--) {
            const rowText = rows[i];
            const cells = rowText.split('\t');
            const rowData = {};
            
            // 데이터 매핑
            cells.forEach((cellValue, index) => {
                if (index < columns.length) {
                    const col = columns[index];
                    rowData[col.field] = cellValue; // trim() 하지 않음 (공백 데이터 유지)
                }
            });
        
            
            // insertRow (key 위치 다음에 추가됨)
            SBGrid3.insertRow(datagrid.grid, key, rowData);
        }

        updateChangeStatus();
        
    } catch (err) {
        console.error('클립보드 붙여넣기 실패:', err);
        ElMessageBox.alert('클립보드 데이터에 접근할 수 없습니다.<br>브라우저 권한을 확인해주세요.', '오류', { dangerouslyUseHTMLString: true });
    }
};

/**
 * 현재 그리드에서 보이는(visible) 행 데이터를 배열로 반환
 * @returns {Array} 현재 화면에 보이는 행 데이터 배열
 */
const getVisibleRows = () => {
    if (!datagrid.grid || typeof SBGrid3 === 'undefined') return [];
    return SBGrid3.findRows(datagrid.grid, (data, row) => row.visible) || [];
};

/**
 * 그리드의 전체 행 데이터(삭제된 행 제외)를 배열로 반환
 * @returns {Array} 전체 행 데이터 배열
 */
const getAllRows = () => {
    if (!datagrid.grid || typeof SBGrid3 === 'undefined') return [];
    return SBGrid3.findRows(datagrid.grid, () => true) || [];
};

/**
 * 엑셀 파일에서 데이터 임포트
 */
const importFromExcel = async (file, options = {}) => {
    const excelImportConfig = {
        delimiter: ',',
        row: { from: 3 },
        col: { from: 2 },
        appendable: true,
        insertStatus: true,
        ...options
    };

    try {
        if (!file) {
            throw new Error('파일이 선택되지 않았습니다.');
        }

        if (!datagrid.grid) {
             throw new Error('그리드가 초기화되지 않았습니다.');
        }

        // SBGrid3의 내장 excelImport 사용
        await SBGrid3.excelImport(datagrid.grid, file, excelImportConfig);
        
        // 데이터 추가 후 변경 상태 업데이트
        updateChangeStatus();

        return {
            success: true,
            message: '엑셀 파일을 성공적으로 불러왔습니다.'
        };

    } catch (error) {
        console.error('[CtvDataGrid] 엑셀 임포트 오류:', error);
        throw error;
    }
};

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 전역 리스너 설정 (최초 1회만 동작)
  setupGlobalBlurCheck();

  // 폼 필드 blur 이벤트 리스너 추가 (필드 입력 완료 시 그리드 동기화)
  handleFormFieldBlur = (e) => {
    const { formModel } = e.detail;
    // 현재 그리드의 focusData와 같은 모델인 경우에만 동기화
    if (formModel === mergedSetting.value.focusData) {
      syncFormToGrid();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('ctv-form-field-blur', handleFormFieldBlur);
  }

  // 컴포넌트 레지스트리에 등록
  if (mergedSetting.value.id) {
    componentRegistry.register(mergedSetting.value.id, {
      id: mergedSetting.value.id,   // id 포함 (prevActive.id 비교를 위해)
      group: mergedSetting.value.group,
      container: gridContainer.value, // 컨테이너 추가 등록 (클릭 감지용)
      query,
      setData,
      datagrid,
      get sbgrid() { return datagrid.grid; }, // getter로 변경하여 unwrap된 값 반환
      save,
      addRow, // 행 추가 메서드 노출
      deleteRow, // 행 삭제 메서드 노출
      importFromExcel, // Excel 업로드 기능 노출
      clearChanges, // Expose clearChanges
      getRowStatus,
      getVisibleRows, // 현재 보이는 행 반환
      getAllRows,      // 전체 행 반환
      state, // Expose reactive state directly
      // getters
      get hasChanges() { return hasChanges.value; },
      get isLoaded() { return state.isLoaded; },
      get totalRows() { return state.totalRows; },
      get selectedRowIdx() { return state.selectedRowIdx; },
      get focusStatus() { return state.focusStatus; },
      // active state helper
      setActive: (active) => { 
          if(active && mergedSetting.value.id) activeGridId.value = mergedSetting.value.id; 
      },
      get focusData() { return state.focusData; }
    });

    // 그룹 이벤트 구독: 클릭 등으로 인해 componentRegistry 활성 컴포넌트가 변경되면 activeGridId 갱신
    const group = mergedSetting.value.group;
    if (group) {
        componentRegistry.subscribe(group, (activeId) => {
            if (activeId === mergedSetting.value.id && activeGridId.value !== activeId) {
                activeGridId.value = activeId;
            }
        });

        // 명시적으로 세팅된 activeComponents가 없으면 첫번째 그리드로 초기화
        if (!componentRegistry.activeComponents.get(group)) {
            componentRegistry.setActive(group, mergedSetting.value.id);
        }
    }

    // 전역 변수로 등록 (window.grid1 등)
    if (typeof window !== 'undefined' && mergedSetting.value.id) {
        window[mergedSetting.value.id] = componentRegistry.get(mergedSetting.value.id);
    }
  }
});

onBeforeUnmount(() => {
  // focusData watcher 정리
  if (focusDataWatcher) {
    focusDataWatcher();
    focusDataWatcher = null;
  }

  // 폼 필드 blur 이벤트 리스너 제거
  if (handleFormFieldBlur && typeof window !== 'undefined') {
    window.removeEventListener('ctv-form-field-blur', handleFormFieldBlur);
    handleFormFieldBlur = null;
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
    window.removeEventListener('beforeunload', handleBeforeUnload);
    handleResize = null;
  }

});

/**
 * 그리드 컨테이너 클릭 핸들러
 * SBGrid3 이벤트와 별개로 컨테이너 클릭 시에도 activeGridId 업데이트
 */
const handleGridClick = () => {
    if (mergedSetting.value.id) {
        activeGridId.value = mergedSetting.value.id;
    }
};



// 외부에서 접근 가능한 메서드 노출
defineExpose({
  setData,
  datagrid,
  sbgrid,
  save,
  addRow,
  deleteRow,
  importFromExcel,
  hasChanges,
  getVisibleRows,
  getAllRows,
  state
});
</script>

<style scoped>
.ctv-data-grid {
  position: relative;
  flex-grow: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid transparent; /* 기본 테두리 */
  box-sizing: border-box;
}
</style>

<style>
/* 행 상세 정보 모달 (넓게 표시 - 전역 스타일) */
.ctv-row-detail-modal {
  --el-messagebox-width: auto !important; /* 너비를 컨텐츠에 맞춤 */
  min-width: 600px; /* 너무 작아지지 않도록 최소 너비 설정 */
  max-width: 840px !important;
  /* 내용물 스크롤 처리 */
}
.ctv-row-detail-modal .el-message-box__content {
    overflow: auto;
    max-height: 80vh;
}
</style>
