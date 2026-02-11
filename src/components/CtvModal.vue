<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :top="top"
    :modal="modal"
    :append-to-body="appendToBody"
    :close-on-click-modal="closeOnClickModal"
    :draggable="draggable"
    class="ctv-modal"
    @close="handleClose"
    v-bind="$attrs"
  >
    <template #header v-if="$slots.header">
        <slot name="header"></slot>
    </template>
    
    <div class="ctv-modal-content">
        <slot></slot>
    </div>
    
    <template #footer v-if="$slots.footer">
      <div class="ctv-modal-footer">
          <slot name="footer"></slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, useSlots } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  width: { type: [String, Number], default: '50%' },
  top: { type: String, default: '15vh' },
  modal: { type: Boolean, default: true },
  appendToBody: { type: Boolean, default: false },
  closeOnClickModal: { type: Boolean, default: false }, // Default to false to prevent accidental closing
  draggable: { type: Boolean, default: true }
});

const emit = defineEmits(['update:modelValue', 'close']);
const slots = useSlots();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const handleClose = () => {
    emit('close');
};
</script>

<style>
/* Note: el-dialog is rendered at root level usually, so scoped styles might not reach it comfortably unless deep is used or global styles.
   However, we added class="ctv-modal" to the dialog. 
   Element Plus dialog styles are global. We can override specific to ctv-modal class.
*/
.ctv-modal .el-dialog__header {
    border-bottom: 1px solid #dcdfe6;
    margin-right: 0;
    padding: 15px 20px;
}

.ctv-modal .el-dialog__body {
    padding: 20px;
}

.ctv-modal .el-dialog__footer {
    border-top: 1px solid #dcdfe6;
    padding: 10px 20px;
    text-align: right;
}

.ctv-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
