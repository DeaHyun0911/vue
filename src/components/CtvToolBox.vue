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
  </div>
</template>

<script setup>
import { computed } from 'vue';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  target: { type: String, default: null },
  left: { type: Array, default: () => [] },
  right: { type: Array, default: () => [] }
});

const defaultButtons = {
  append: { id: 'append', label: '추가', action: 'append', icon: 'Plus' },
  delete: { id: 'delete', label: '삭제', action: 'delete', icon: 'Minus', plain: true },
  save: { id: 'save', label: '저장', action: 'save', icon: 'Check', type: 'primary' },
  excel: { id: 'excel', action: 'excel', icon: 'Download', plain: true },
  print: { id: 'print', action: 'print', icon: 'Printer' },
};

const resolveButtons = (list) => {
  return list.map(item => {
    if (typeof item === 'string') {
      return defaultButtons[item] ? { ...defaultButtons[item] } : { id: item, label: item, action: item };
    } else if (typeof item === 'object') {
        // Merge with default if id/action matches
        const key = item.id || item.action;
        if (key && defaultButtons[key]) {
            return { ...defaultButtons[key], ...item };
        }
        return item;
    }
    return item;
  });
};

const resolvedLeftButtons = computed(() => resolveButtons(props.left));
const resolvedRightButtons = computed(() => resolveButtons(props.right));

import { ElMessageBox } from 'element-plus';

const handleAction = async (btn) => {
  // 1. target 컴포넌트 찾기
  if (!props.target) return;
  const targetComponent = componentRegistry.get(props.target);
  if (!targetComponent) {
      console.warn(`[CtvToolBox] Target component '${props.target}' not found.`);
      return;
  }

  // 2. DataGrid 메서드 호출
  const grid = targetComponent.datagrid?.grid;
  const action = btn.action;
  
  if (action === 'append') {
      if (typeof SBGrid3 !== 'undefined' && grid) {
          SBGrid3.appendRow(grid);
      } else if (targetComponent.appendRow) {
          targetComponent.appendRow();
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
          console.warn(`[CtvToolBox] Target component '${props.target}' does not support save.`);
      }
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
      console.warn(`[CtvToolBox] Action '${action}' not supported by target '${props.target}'.`);
  }
};
</script>

<style scoped>
.ctv-tool-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 8px;
}

.left-tools, .right-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
