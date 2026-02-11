<template>
  <ctv-modal
    v-model="visible"
    :title="title"
    :width="width"
    :top="top"
    :modal="modal"
    :append-to-body="appendToBody"
    :close-on-click-modal="false"
    :draggable="draggable"
    @close="handleCancel"
  >
    <div class="ctv-confirm-body">
      <div v-if="icon" class="ctv-confirm-icon" :class="iconClass">
        <component :is="iconComponent" />
      </div>
      <div class="ctv-confirm-message">
        <slot>{{ message }}</slot>
      </div>
    </div>

    <template #footer>
      <ctv-button @click="handleCancel">{{ cancelText }}</ctv-button>
      <ctv-button type="primary" @click="handleConfirm">{{ confirmText }}</ctv-button>
    </template>
  </ctv-modal>
</template>

<script setup>
import { computed } from 'vue';
import CtvModal from './CtvModal.vue';
import CtvButton from './CtvButton.vue';

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '알림' },
  message: { type: String, default: '' },
  width: { type: [String, Number], default: '400px' },
  top: { type: String, default: '30vh' },
  modal: { type: Boolean, default: true },
  appendToBody: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  confirmText: { type: String, default: '확인' },
  cancelText: { type: String, default: '취소' },
  type: { type: String, default: '' }, // success, warning, info, error
  icon: { type: [String, Object], default: null }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const handleConfirm = () => {
  emit('confirm');
  visible.value = false;
};

const handleCancel = () => {
  emit('cancel');
  visible.value = false;
};

const iconComponent = computed(() => {
    if (props.icon) return props.icon;
    switch(props.type) {
        case 'warning': return 'Warning';
        case 'error': return 'CircleCloseFilled';
        case 'success': return 'CircleCheckFilled';
        case 'info': return 'InfoFilled';
        default: return null;
    }
});

const iconClass = computed(() => {
    return props.type ? `is-${props.type}` : '';
});
</script>

<style scoped>
.ctv-confirm-body {
    display: flex;
    align-items: flex-start;
    padding: 10px 0;
}

.ctv-confirm-icon {
    font-size: 24px;
    margin-right: 12px;
    margin-top: -2px; /* Slight adjustment for alignment */
}

.ctv-confirm-icon.is-warning { color: #e6a23c; }
.ctv-confirm-icon.is-error { color: #f56c6c; }
.ctv-confirm-icon.is-success { color: #67c23a; }
.ctv-confirm-icon.is-info { color: #909399; }

.ctv-confirm-message {
    flex: 1;
    line-height: 1.5;
    font-size: 14px;
    color: #606266;
    word-break: break-all;
}
</style>
