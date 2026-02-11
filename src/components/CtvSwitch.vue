<template>
  <div class="ctv-switch-wrapper" :style="wrapperStyle">
    <label 
      v-if="title" 
      class="ctv-label" 
      :class="labelClasses"
      :style="{ width: labelWidth + 'px' }"
    >
      {{ title }}
    </label>
    <el-switch
      v-model="innerValue"
      :active-text="activeText"
      :inactive-text="inactiveText"
      :disabled="disabled"
      @change="$emit('change', $event)"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [Boolean, String, Number],
  title: String,
  labelAlign: { type: String, default: 'left' },
  labelWidth: { type: [String, Number], default: 100 },
  activeText: String,
  inactiveText: String,
  disabled: Boolean,
});

const emit = defineEmits(['update:modelValue', 'change']);

const innerValue = computed({
  get: () => !!props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const wrapperStyle = computed(() => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: '5px'
}));

const labelClasses = computed(() => ({
    [`align-${props.labelAlign}`]: true
}));
</script>

<style scoped>
</style>
