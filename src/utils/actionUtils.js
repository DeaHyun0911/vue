/**
 * actionUtils.js
 * 
 * CtvToolBox, CtvButton 등에서 공통으로 사용하는 액션 실행 유틸리티.
 * componentRegistry를 통해 target 컴포넌트를 찾고 지정된 action을 실행합니다.
 */
import componentRegistry from './componentRegistry.js';
import { ElMessageBox } from 'element-plus';

/**
 * action 이름에 따라 target 컴포넌트의 현재 상태로부터 disabled 여부를 자동 결정
 * @param {string} action
 * @param {object|null} targetInstance
 * @returns {boolean}
 */
export function resolveAutoDisabled(action, targetInstance) {
    if (!targetInstance) return false;

    if (action === 'save') {
        const hc = targetInstance.hasChanges;
        const val = (hc && typeof hc === 'object' && 'value' in hc) ? hc.value : hc;
        return !val;
    }
    if (action === 'append') {
        const il = targetInstance.isLoaded;
        const val = (il && typeof il === 'object' && 'value' in il) ? il.value : il;
        return !val;
    }
    if (action === 'delete') {
        const isLoaded = targetInstance.isLoaded;
        const hasRows = targetInstance.totalRows > 0;
        const hasSelection = targetInstance.selectedRowIdx !== -1;
        return !(isLoaded && hasRows && hasSelection);
    }
    return false;
}

/**
 * targetId로 컴포넌트 인스턴스를 찾는 공통 함수
 * @param {string} targetId
 * @returns {object|null}
 */
export function resolveTarget(targetId) {
    if (!targetId) return null;
    return componentRegistry.get(targetId) || componentRegistry.getActive(targetId) || null;
}

/**
 * 지정된 action을 target 컴포넌트에서 실행하는 공통 함수
 * @param {string} action - 실행할 액션명 ('query', 'save', 'append', 'delete', 'excel', 또는 커스텀 메서드명)
 * @param {string} targetId - componentRegistry에 등록된 컴포넌트 ID
 * @param {object} [options] - 추가 옵션 (emit 핸들러 등)
 * @param {function} [options.onUnknownAction] - 알 수 없는 액션 시 호출되는 콜백(action, targetComponent)
 */
export async function executeAction(action, targetId, options = {}) {
    const targetComponent = resolveTarget(targetId);

    if (!targetComponent) {
        console.warn(`[actionUtils] Target '${targetId}'를 찾을 수 없습니다.`);
        return;
    }

    const grid = targetComponent.datagrid?.grid;

    if (action === 'append') {
        if (typeof targetComponent.addRow === 'function') {
            targetComponent.addRow();
        }

    } else if (action === 'delete') {
        if (typeof SBGrid3 !== 'undefined' && grid) {
            const selectedKey = SBGrid3.getFocusedKey(grid);
            const rowItem = SBGrid3.getFocusedRow(grid);

            if (!rowItem) {
                if (top.SetMessage) top.SetMessage('삭제할 행을 선택하세요.');
                else alert('삭제할 행을 선택하세요.');
                return;
            }

            if (rowItem.status !== 'insert') {
                try {
                    await ElMessageBox.confirm(
                        '현재(선택)행을 삭제합니다.\n삭제(→저장)를 하시면 데이터가 완전하게 삭제됩니다.\n삭제하시겠습니까?',
                        '삭제 확인',
                        { confirmButtonText: '확인', cancelButtonText: '취소' }
                    );
                } catch (e) {
                    return;
                }
            }

            const currRowIndex = typeof rowItem._rowIndex !== 'undefined' ? rowItem._rowIndex : -1;
            const nextRow = currRowIndex > 0 ? SBGrid3.getRowByIndex(grid, currRowIndex - 1) : null;
            const column = SBGrid3.getFocusedColumn(grid);

            if (selectedKey && selectedKey.length > 0) {
                SBGrid3.deleteRow(grid, selectedKey);
                if (nextRow && column) SBGrid3.moveFocus(grid, nextRow, column);
            } else {
                if (top.SetMessage) top.SetMessage('삭제할 행을 선택하세요.');
                else alert('삭제할 행을 선택하세요.');
            }
        } else if (typeof targetComponent.deleteRow === 'function') {
            targetComponent.deleteRow();
        }

    } else if (action === 'save') {
        if (typeof targetComponent.save === 'function') {
            await targetComponent.save();
        }

    } else if (action === 'excel') {
        if (typeof SBGrid3 !== 'undefined' && grid) {
            SBGrid3.excelExport(grid);
        } else if (typeof targetComponent.exportExcel === 'function') {
            targetComponent.exportExcel();
        }

    } else if (action === 'query') {
        if (typeof targetComponent.query === 'function') {
            targetComponent.query();
        }

    } else if (typeof targetComponent[action] === 'function') {
        // 컴포넌트에 정의된 커스텀 메서드 직접 호출
        targetComponent[action]();

    } else {
        // 알 수 없는 액션 → 콜백으로 전달
        if (typeof options.onUnknownAction === 'function') {
            options.onUnknownAction(action, targetComponent);
        } else {
            console.warn(`[actionUtils] '${action}' 액션을 처리할 수 없습니다.`);
        }
    }
}
