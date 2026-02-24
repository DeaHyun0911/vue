<template>
  <!-- tooltip이 있으면 el-tooltip으로 감싸기 -->
  <el-tooltip
    v-if="resolvedTooltip"
    :content="resolvedTooltip"
    :placement="tooltipPlacement"
    :disabled="!resolvedTooltip"
  >
    <!-- disabled 상태에서 tooltip이 작동하려면 span 래퍼 필요 -->
    <span :class="{ 'ctv-btn-wrapper': resolvedDisabled }">
      <el-button
        :type="type"
        :plain="plain"
        :round="round"
        :circle="circle"
        :disabled="resolvedDisabled"
        :class="{ 'is-icon-only': isIconOnly }"
        :style="resolvedDisabled ? { pointerEvents: 'none' } : {}"
        @click="handleClick"
      >
        <el-icon v-if="icon" :class="{ 'el-icon--left': hasContent }">
          <component :is="icon" />
        </el-icon>
        <slot></slot>
      </el-button>
    </span>
  </el-tooltip>

  <!-- tooltip이 없으면 버튼만 -->
  <el-button
    v-else
    :type="type"
    :plain="plain"
    :round="round"
    :circle="circle"
    :disabled="resolvedDisabled"
    :class="{ 'is-icon-only': isIconOnly }"
    @click="handleClick"
  >
    <el-icon v-if="icon" :class="{ 'el-icon--left': hasContent }">
      <component :is="icon" />
    </el-icon>
    <slot></slot>
  </el-button>
</template>

<script setup>
import { useSlots, computed, Comment, Text, ref, onMounted, onBeforeUnmount } from 'vue';
import { executeAction, resolveAutoDisabled, resolveTarget } from '../utils/actionUtils.js';
import componentRegistry from '../utils/componentRegistry.js';

const props = defineProps({
  type: String,
  plain: Boolean,
  round: Boolean,
  circle: Boolean,
  disabled: Boolean,
  icon: [String, Object],
  /** 액션을 실행할 대상 컴포넌트 ID */
  target: { type: String, default: null },
  /** 실행할 액션명 */
  action: { type: String, default: null },
  /** true 시, target 상태에 따라 disabled 자동 제어 */
  autoDisable: { type: Boolean, default: false },
  /**
   * 버튼 위에 표시할 툴팁 메시지
   * - 문자열: 항상 표시
   * - 함수: () => string | null 반환값이 있을 때만 표시
   * 예: tooltip="삭제 불가 (디테일 데이터 존재)"
   * 예: :tooltip="() => grid2.totalRows > 0 ? '디테일이 있어 삭제할 수 없습니다' : null"
   */
  tooltip: { type: [String, Function], default: null },
  /** 툴팁 표시 위치 (top | bottom | left | right) */
  tooltipPlacement: { type: String, default: 'bottom' },
});

const emit = defineEmits(['click', 'action']);
const slots = useSlots();

// ─── target 인스턴스 추적 ───────────────────────────────────
const targetInstance = ref(null);
let pollTimer = null;

onMounted(() => {
  if (!props.target) return;
  let isSubscribed = false;
  const findTarget = () => {
    const inst = resolveTarget(props.target);
    if (inst) {
      targetInstance.value = inst;
      if (pollTimer) clearInterval(pollTimer);
    }
  };
  if (!isSubscribed) {
    componentRegistry.subscribe?.(props.target, (activeId) => {
      targetInstance.value = resolveTarget(activeId);
    });
    isSubscribed = true;
  }
  findTarget();
  if (!targetInstance.value) {
    pollTimer = setInterval(findTarget, 200);
    setTimeout(() => { if (pollTimer) clearInterval(pollTimer); }, 5000);
  }
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});

// ─── disabled 계산 ───────────────────────────────────────────
const resolvedDisabled = computed(() => {
  if (props.disabled) return true;
  if (props.autoDisable && props.action && targetInstance.value) {
    return resolveAutoDisabled(props.action, targetInstance.value);
  }
  return false;
});

// ─── tooltip 계산 ─────────────────────────────────────────────
const resolvedTooltip = computed(() => {
  if (!props.tooltip) return null;
  if (typeof props.tooltip === 'function') {
    return props.tooltip() || null;
  }
  return props.tooltip;
});

// ─── 클릭 핸들러 ─────────────────────────────────────────────
const handleClick = async (event) => {
  if (props.action && props.target) {
    await executeAction(props.action, props.target, {
      onUnknownAction: (action, comp) => emit('action', action, comp)
    });
    return;
  }
  emit('click', event);
};

// ─── 아이콘 전용 여부 ─────────────────────────────────────────
const hasContent = computed(() => {
  if (!slots.default) return false;
  const nodes = slots.default();
  return nodes.some(node => {
    if (node.type === Comment) return false;
    if (node.type === Text || typeof node.children === 'string') {
      return node.children && node.children.trim().length > 0;
    }
    return true;
  });
});

const isIconOnly = computed(() => props.icon && !hasContent.value);
</script>

<style scoped>
.is-icon-only {
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  min-width: 32px !important;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

/* disabled 상태에서 tooltip이 작동하려면 버튼 위에 래퍼 span이 pointer-events를 가져야 함 */
.ctv-btn-wrapper {
  display: inline-flex;
  cursor: not-allowed;
}
.ctv-btn-wrapper .el-button.is-disabled {
  pointer-events: none;
}
</style>
