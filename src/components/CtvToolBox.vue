<template>
  <div class="ctv-tool-box">
    <div class="left-tools">
      <template v-for="btn in resolvedLeftButtons" :key="btn.id">
        <ctv-button 
          v-if="btn.visible !== false"
          :type="btn.type" 
          :icon="btn.icon" 
          :disabled="typeof btn.disabled === 'function' ? btn.disabled() : btn.disabled"
          :tooltip="btn.tooltip"
          :tooltip-placement="btn.tooltipPlacement"
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
          :disabled="typeof btn.disabled === 'function' ? btn.disabled() : btn.disabled"
          :tooltip="btn.tooltip"
          :tooltip-placement="btn.tooltipPlacement"
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessageBox } from 'element-plus';
import componentRegistry from '../utils/componentRegistry.js';
import { executeAction, resolveAutoDisabled, resolveTarget } from '../utils/actionUtils.js';

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

// ─── target 인스턴스 추적 ───────────────────────────────────
const targetInstance = ref(null);
let pollTimer = null;

onMounted(() => {
    const targetId = mergedSetting.value.target;
    if (targetId) {
        let isSubscribed = false;

        const findTarget = () => {
            const instance = resolveTarget(targetId);
            if (instance) {
                targetInstance.value = instance;
                if (pollTimer) clearInterval(pollTimer);
            }
        };

        if (!isSubscribed) {
            componentRegistry.subscribe?.(targetId, (activeId) => {
                targetInstance.value = resolveTarget(activeId);
            });
            isSubscribed = true;
        }

        findTarget();
        if (!targetInstance.value) {
            pollTimer = setInterval(findTarget, 200);
            setTimeout(() => { if (pollTimer) clearInterval(pollTimer); }, 5000);
        }
    }
});

onBeforeUnmount(() => {
    if (pollTimer) clearInterval(pollTimer);
});

// ─── 기본 버튼 정의 ──────────────────────────────────────────
const defaultButtons = {
  append:      { id: 'append',      label: '추가',         action: 'append',      icon: 'Plus' },
  delete:      { id: 'delete',      label: '삭제',         action: 'delete',      icon: 'Minus', plain: true },
  save:        { id: 'save',        label: '저장',         action: 'save',        icon: 'Check', type: 'primary' },
  excel:       { id: 'excel',       label: '엑셀',         action: 'excel',       icon: 'Download', plain: true },
  print:       { id: 'print',       label: '인쇄',         action: 'print',       icon: 'Printer' },
  excelImport: { id: 'excelImport', label: '엑셀일괄등록', action: 'excelImport', icon: 'Upload' },
};

// ─── 버튼 목록 정규화 + autoDisable 적용 ─────────────────────
const resolveButtons = (list) => {
  return list.map(item => {
    let btn;

    if (typeof item === 'string') {
        btn = defaultButtons[item] ? { ...defaultButtons[item] } : { id: item, label: item, action: item };
    } else {
        const key = item.id || item.action || item.tool;
        btn = key && defaultButtons[key] ? { ...defaultButtons[key], ...item } : { ...item };
        if (!btn.action && key) btn.action = key;
    }

    // 사용자가 직접 disabled를 지정하지 않은 경우에만 자동 결정
    if (btn.action && !Object.prototype.hasOwnProperty.call(item, 'disabled')) {
        const autoVal = resolveAutoDisabled(btn.action, targetInstance.value);
        if (autoVal !== false || ['save', 'append', 'delete'].includes(btn.action)) {
            btn.disabled = autoVal;
        }
    }

    return btn;
  });
};

const resolvedLeftButtons  = computed(() => resolveButtons(mergedSetting.value.left));
const resolvedRightButtons = computed(() => resolveButtons(mergedSetting.value.right));

// ─── 액션 핸들러 (actionUtils 공통 함수 위임) ─────────────────
const handleAction = async (btn) => {
  if (btn.action === 'excelImport') {
      excelUploadVisible.value = true;
      return;
  }

  await executeAction(btn.action, mergedSetting.value.target, {
    onUnknownAction: (action, comp) => emit('action', action, comp)
  });
};

// ─── 내장 엑셀 업로드 처리 ────────────────────────────────────
const excelUploadVisible = ref(false);
const isExcelUploading   = ref(false);

const excelSampleName = computed(() => mergedSetting.value.excelImportConfig?.sampleName || '');

const handleExcelUpload = async (file) => {
    if (!file) return;

    const targetComponent = resolveTarget(mergedSetting.value.target);

    if (!targetComponent || typeof targetComponent.importFromExcel !== 'function') {
        if (window.Ctv?.ctvAlert) {
            window.Ctv.ctvAlert('이 기능을 지원하지 않는 그리드이거나 타겟을 찾을 수 없습니다.', '오류');
        } else {
            ElMessageBox.alert('이 기능을 지원하지 않는 대상입니다.', '오류', { type: 'error' });
        }
        return;
    }

    isExcelUploading.value = true;
    try {
        await targetComponent.importFromExcel(file, mergedSetting.value.excelImportConfig || {});

        if (window.Ctv?.ctvAlert) {
            window.Ctv.ctvAlert('엑셀 데이터를 성공적으로 불러왔습니다.<br>데이터를 확인하시고 <b>저장</b> 버튼을 클릭하여 반영해주세요.', '알림');
        } else {
            ElMessageBox.alert('엑셀 데이터를 성공적으로 불러왔습니다.', '알림', { type: 'success' });
        }
        excelUploadVisible.value = false;
    } catch (error) {
        console.error('엑셀 업로드 오류:', error);
        if (window.Ctv?.ctvAlert) {
            window.Ctv.ctvAlert(`엑셀 임포트 중 오류가 발생했습니다.<br>${error.message || ''}`, '오류');
        } else {
            ElMessageBox.alert(`오류가 발생했습니다.<br>${error.message}`, '오류', { type: 'error', dangerouslyUseHTMLString: true });
        }
    } finally {
        isExcelUploading.value = false;
    }
};
</script>
