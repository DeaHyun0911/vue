<template>
  <el-button 
    :type="type" 
    :plain="plain" 
    :round="round" 
    :circle="circle" 
    :disabled="disabled"
    :class="{ 'is-icon-only': isIconOnly }"
    @click="$emit('click', $event)"
  >
    <el-icon v-if="icon" :class="{ 'el-icon--left': hasContent }">
      <component :is="icon" />
    </el-icon>
    <slot></slot>
  </el-button>
</template>

<script setup>
import { useSlots, computed, Comment, Text } from 'vue';

const props = defineProps({
  type: String,
  plain: Boolean,
  round: Boolean,
  circle: Boolean,
  disabled: Boolean,
  icon: [String, Object] // New prop for icon component
});

const emit = defineEmits(['click']);
const slots = useSlots();

const hasContent = computed(() => {
  if (!slots.default) return false;
  const nodes = slots.default();
  return nodes.some(node => {
    // Ignore comments
    if (node.type === Comment) return false;
    // Check text nodes
    if (node.type === Text || typeof node.children === 'string') {
        return node.children && node.children.trim().length > 0;
    }
    // Any other node type (Element, Component) is content
    return true;
  });
});

const isIconOnly = computed(() => {
  return props.icon && !hasContent.value;
});
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
</style>
