<template>
  <div class="ctv-tool-box">
    <div class="left-tools">
      <template v-for="btn in resolvedLeftButtons" :key="btn.id">
        <ctv-button 
          v-if="btn.visible !== false"
          :type="btn.type" 
          :icon="btn.icon" 
          :disabled="btn.disabled"
          @click="handleAction(btn)"
        >
          {{ btn.label }}
        </ctv-button>
      </template>
      <slot name="left"></slot>
    </div>
    <div class="right-tools">
      <slot name="right"></slot>
      <template v-for="btn in resolvedRightButtons" :key="btn.id">
        <ctv-button 
          v-if="btn.visible !== false"
          :type="btn.type" 
          :icon="btn.icon" 
          :disabled="btn.disabled"
          @click="handleAction(btn)"
        >
          {{ btn.label }}
        </ctv-button>
      </template>
    </div>

    <!-- 내장 엑셀 일괄 등록 모달 -->
    <ctv-excel-upload-modal
      v-model="excelUploadVisible"
      :sample-name="excelSampleName"
      :uploading="isExcelUploading"
      @upload="handleExcelUpload"
    ></ctv-excel-upload-modal>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  target: { type: String, default: null },
  left: { type: Array, default: () => [] },
  right: { type: Array, default: () => [] },
  setting: { type: Object, default: null }
});

const emit = defineEmits(['action']);

const mergedSetting = computed(() => {
    const settings = props.setting || {};
    return {
        target: props.target || settings.target,
        left: (props.left && props.left.length) ? props.left : (settings.left || []),
        right: (props.right && props.right.length) ? props.right : (settings.right || []),
        excelImportConfig: settings.excelImportConfig || {}
    };
});

const targetInstance = ref(null);

import { onMounted, onBeforeUnmount, ref } from 'vue';

let pollTimer = null;

onMounted(() => {
    const targetId = mergedSetting.value.target;
    if (targetId) {
        let isSubscribed = false;

        const findTarget = () => {
             // 1. Try to get as specific component
             let instance = componentRegistry.get(targetId);
             
             // 2. If not found, try as group active component
             if (!instance) {
                 instance = componentRegistry.getActive(targetId); 
                 
                 // If it is a group, subscribe to changes (only once)
                 if (!isSubscribed) {
                     // Check if it looks like a group (has members or is active)
                     // Or just blindly subscribe if it's the targetId
                     componentRegistry.subscribe(targetId, (activeId) => {
                         targetInstance.value = componentRegistry.get(activeId);
                     });
                     isSubscribed = true;
                 }
             }
             
             if (instance) {
                 targetInstance.value = instance;
                 if (pollTimer) clearInterval(pollTimer);
             }
        };
        
        findTarget();
        if (!targetInstance.value) {
            pollTimer = setInterval(findTarget, 200);
            // 5초 후 중단
            setTimeout(() => {
                if (pollTimer) clearInterval(pollTimer);
            }, 5000);
        }
    }
});

onBeforeUnmount(() => {
    if (pollTimer) clearInterval(pollTimer);
});

const defaultButtons = {
  append: { id: 'append', label: '추가', action: 'append', icon: 'Plus' },
  delete: { id: 'delete', label: '삭제', action: 'delete', icon: 'Minus', plain: true },
  save: { id: 'save', label: '저장', action: 'save', icon: 'Check', type: 'primary' },
  excel: { id: 'excel', action: 'excel', icon: 'Download', plain: true },
  print: { id: 'print', action: 'print', icon: 'Printer' },
  excelImport: { id: 'excelImport', label: '엑셀일괄등록', action: 'excelImport', icon: 'Upload' }
};

const resolveButtons = (list) => {
  return list.map(item => {
    if (typeof item === 'string') {
      const btn = defaultButtons[item] ? { ...defaultButtons[item] } : { id: item, label: item, action: item };
      
      if (btn.action === 'save') {
           if (targetInstance.value && typeof targetInstance.value.hasChanges !== 'undefined') {
               btn.disabled = !targetInstance.value.hasChanges;
           }
      }

      // append 버튼 상태 처리 (문자열)
      if (btn.action === 'append') {
           if (targetInstance.value && typeof targetInstance.value.isLoaded !== 'undefined') {
               btn.disabled = !targetInstance.value.isLoaded;
           }
      }

      // delete 버튼 상태 처리 (문자열)
      if (btn.action === 'delete') {
           if (targetInstance.value) {
               const isLoaded = targetInstance.value.isLoaded;
               const hasRows = targetInstance.value.totalRows > 0;
               const hasSelection = targetInstance.value.selectedRowIdx !== -1;
               btn.disabled = !(isLoaded && hasRows && hasSelection);
           }
      }
      return btn;
    } else if (typeof item === 'object') {
        // Merge with default if id/action/tool matches
        const key = item.id || item.action || item.tool;
        let btn = { ...item };

        if (key && defaultButtons[key]) {
            btn = { ...defaultButtons[key], ...item };
            if (!btn.action) btn.action = defaultButtons[key].action;
        }
        
        // save 버튼 상태 처리
        if (btn.action === 'save') {
             // targetInstance가 있고 hasChanges 속성이 있으면 그 값에 따라 disabled 설정
             // hasChanges가 true면 disabled false (활성화)
             // hasChanges가 false면 disabled true (비활성화)
             // 단, item.disabled가 명시적으로 true면 항상 비활성화
             if (targetInstance.value && typeof targetInstance.value.hasChanges !== 'undefined') {
                 if (!btn.disabled) {
                      btn.disabled = !targetInstance.value.hasChanges;
                 }
             }
        }
        
        // append 버튼 상태 처리
        if (btn.action === 'append') {
             if (targetInstance.value) {
                 // 데이터 조회 여부 (isLoaded)
                 if (typeof targetInstance.value.isLoaded !== 'undefined') {
                     // 기본적으로 조회 되어야 활성화
                     btn.disabled = !targetInstance.value.isLoaded;
                 }
             }
        }

        // delete 버튼 상태 처리
        if (btn.action === 'delete') {
             if (targetInstance.value) {
                 // 조회 되었고(isLoaded), 데이터가 있고(totalRows > 0), 선택된 행이 있어야 함(selectedRowIdx != -1)
                 // 단, SBGrid 로직에 따라 행이 없어도 선택이 안되어도 될 수 있지만 요청사항 따름
                 const isLoaded = targetInstance.value.isLoaded;
                 const hasRows = targetInstance.value.totalRows > 0;
                 const hasSelection = targetInstance.value.selectedRowIdx !== -1;
                 
                 btn.disabled = !(isLoaded && hasRows && hasSelection);
             }
        }
        
        return btn;
    }
    return item;
  });
};

const resolvedLeftButtons = computed(() => resolveButtons(mergedSetting.value.left));
const resolvedRightButtons = computed(() => resolveButtons(mergedSetting.value.right));

import { ElMessageBox } from 'element-plus';

const handleAction = async (btn) => {
  // 1. target 컴포넌트 찾기
  let targetComponent = null;
  const targetId = mergedSetting.value.target;
  
  if (targetId) {
      // 1. ID로 직접 찾기
      targetComponent = componentRegistry.get(targetId);
      
      // 2. ID로 못 찾으면 그룹으로 간주하고 활성 컴포넌트 찾기
      if (!targetComponent) {
          targetComponent = componentRegistry.getActive(targetId);
      }
  }

  if (!targetComponent) {
      console.warn(`[CtvToolBox] Target '${targetId}' not found (tried as ID and Group).`);
      return;
  }

  // 2. DataGrid 메서드 호출
  const grid = targetComponent.datagrid?.grid;
  const action = btn.action;
  
  if (action === 'append') {
if (targetComponent.addRow) {
          targetComponent.addRow();
      }
  } else if (action === 'delete') {
      // SBGrid3 삭제 로직 상세 구현
      if (typeof SBGrid3 !== 'undefined' && grid) {
          const selectedKey = SBGrid3.getFocusedKey(grid);
          const rowItem = SBGrid3.getFocusedRow(grid);

          if (!rowItem) {
              if (top.SetMessage) top.SetMessage("삭제할 행을 선택하세요.");
              else alert("삭제할 행을 선택하세요.");
              return;
          }

          // 신규 입력(insert) 상태가 아니면 삭제 확인
          if (rowItem.status !== "insert") {
               try {
                   await ElMessageBox.confirm(
                       '현재(선택)행을 삭제합니다.\n삭제(→저장)를 하시면 데이터가 완전하게 삭제됩니다.\n삭제하시겠습니까?',
                       '삭제 확인',
                       {
                           confirmButtonText: '확인',
                           cancelButtonText: '취소',
                       }
                   );
               } catch (e) {
                   // 취소 시 중단
                   return;
               }
          }

          // 다음 포커스 이동을 위한 준비 (선택적)
          const currRowIndex = typeof rowItem._rowIndex !== 'undefined' ? rowItem._rowIndex : -1;
          const nextRow = currRowIndex > 0 ? SBGrid3.getRowByIndex(grid, currRowIndex - 1) : null;
          const column = SBGrid3.getFocusedColumn(grid);

          if (selectedKey && selectedKey.length > 0) {
              SBGrid3.deleteRow(grid, selectedKey);
              
               // 포커스 이동
              if (nextRow && column) {
                  SBGrid3.moveFocus(grid, nextRow, column);
              }
          } else {
               if (top.SetMessage) top.SetMessage("삭제할 행을 선택하세요.");
               else alert("삭제할 행을 선택하세요.");
          }

      } else if (targetComponent.deleteRow) {
          targetComponent.deleteRow();
      }
  } else if (action === 'save') {
      if (typeof targetComponent.save === 'function') {
          await targetComponent.save();
      } else {
          console.warn(`[CtvToolBox] Target component '${mergedSetting.value.target}' does not support save.`);
      }
  } else if (action === 'excelImport') {
      excelUploadVisible.value = true;
  } else if (action === 'excel') {
      if (typeof SBGrid3 !== 'undefined' && grid) {
          SBGrid3.excelExport(grid);
      } else if (targetComponent.exportExcel) {
          targetComponent.exportExcel();
      }
  } else if (typeof targetComponent[action] === 'function') {
      // 일반적인 메서드 호출
      targetComponent[action]();
  } else {
      // 지정된 action이 target 컴포넌트에 없으면 이벤트를 상위로 올려보냄
      emit('action', action, targetComponent);
  }
};

// --- 내장 엑셀 업로드 처리 로직 ---
const excelUploadVisible = ref(false);
const isExcelUploading = ref(false);

const excelSampleName = computed(() => {
    return mergedSetting.value.excelImportConfig?.sampleName || '';
});

const handleExcelUpload = async (file) => {
    if (!file) return;

    let targetComponent = null;
    const targetId = mergedSetting.value.target;
    if (targetId) {
        targetComponent = componentRegistry.get(targetId) || componentRegistry.getActive(targetId);
    }

    if (!targetComponent || typeof targetComponent.importFromExcel !== 'function') {
        if(window.Ctv && window.Ctv.ctvAlert) {
            window.Ctv.ctvAlert('이 기능을 지원하지 않는 그리드이거나 타겟을 찾을 수 없습니다.', '오류');
        } else {
            ElMessageBox.alert('이 기능을 지원하지 않는 대상입니다.', '오류', { type: 'error' });
        }
        return;
    }

    isExcelUploading.value = true;
    try {
        await targetComponent.importFromExcel(file, mergedSetting.value.excelImportConfig || {});
        
        if (window.Ctv && window.Ctv.ctvAlert) {
            window.Ctv.ctvAlert('엑셀 데이터를 성공적으로 불러왔습니다.<br>데이터를 확인하시고 <b>저장</b> 버튼을 클릭하여 반영해주세요.', '알림');
        } else {
            ElMessageBox.alert('엑셀 데이터를 성공적으로 불러왔습니다.', '알림', { type: 'success' });
        }
        excelUploadVisible.value = false;
    } catch (error) {
        console.error("엑셀 업로드 오류:", error);
        if (window.Ctv && window.Ctv.ctvAlert) {
            window.Ctv.ctvAlert(`엑셀 임포트 중 오류가 발생했습니다.<br>${error.message || ''}`, '오류');
        } else {
            ElMessageBox.alert(`오류가 발생했습니다.<br>${error.message}`, '오류', { type: 'error', dangerouslyUseHTMLString: true });
        }
    } finally {
        isExcelUploading.value = false;
    }
};
// ------------------------------------

</script>

<style scoped>
.ctv-tool-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.left-tools, .right-tools {
  display: flex;
  align-items: center;
}
</style>
