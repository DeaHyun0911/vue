<template>
  <el-button 
    :type="type" 
    :plain="plain" 
    :round="round" 
    :circle="circle" 
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </el-button>
</template>

<script setup>
const props = defineProps({
  type: String,
  plain: Boolean,
  round: Boolean,
  circle: Boolean,
  disabled: Boolean,
});

const emit = defineEmits(['click']);
</script>
