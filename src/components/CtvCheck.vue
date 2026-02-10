<template>
  <div class="ctv-check-wrapper" :style="wrapperStyle">
    <el-checkbox
      v-model="innerValue"
      :label="label"
      :disabled="disabled"
      :checked="!!modelValue"
      @change="$emit('change', $event)"
      v-bind="$attrs"
    >
      <slot>{{ label }}</slot>
    </el-checkbox>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [Boolean, String, Number],
  label: String,
  disabled: Boolean,
});

const emit = defineEmits(['update:modelValue', 'change']);

const innerValue = computed({
  get: () => !!props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const wrapperStyle = computed(() => ({
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '10px'
}));
</script>

<style scoped>
.ctv-check-wrapper {
    /* Style wrapper if needed */
}
</style>
