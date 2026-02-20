<template>
  <el-form-item v-bind="$attrs" :prop="prop" :rules="rules" class="ctv-form-item">
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-form-item>
</template>

<script setup>
defineProps({
  prop: {
    type: [String, Array],
    default: ''
  },
  rules: {
    type: [Object, Array],
    default: () => []
  }
});
</script>

<style scoped>
:deep(.el-form-item__label) {
  font-weight: 600;
}

.el-form-item {
  margin-bottom: 0px;
}
</style>
