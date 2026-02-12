<template>
  <el-container class="ctv-container">
    <el-header v-if="$slots.header" :height="headerHeight">
      <slot name="header"></slot>
    </el-header>
    
    <el-container :direction="direction" :style="{ gap: gap }">
      <el-aside v-if="$slots.aside" :width="asideWidth">
        <slot name="aside"></slot>
      </el-aside>
      
      <el-main>
        <slot></slot>
      </el-main>
    </el-container>
    
    <el-footer v-if="$slots.footer" :height="footerHeight">
      <slot name="footer"></slot>
    </el-footer>
  </el-container>
</template>

<script setup>
defineProps({
  direction: {
    type: String, // 'horizontal' | 'vertical'
    default: undefined // By default, el-container determines based on children
  },
  headerHeight: {
    type: String,
    default: '60px'
  },
  footerHeight: {
    type: String,
    default: '60px'
  },
  asideWidth: {
    type: String,
    default: '300px'
  },
  gap: {
    type: String,
    default: '0px'
  }
});
</script>

<style scoped>
.ctv-container {
  height: 100vh; /* 전체 화면 높이 사용 */
  overflow: hidden; /* 전체 스크롤 방지 */
}

/* el-main이 컨텐츠에 따라 늘어나지 않고 영역 내에서 스크롤되도록 설정 */
:deep(.el-main) {
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 내부 컨텐츠(그리드 등)가 자체 스크롤을 가지도록 */
    padding: 0px; /* 기본 패딩 */
}

/* 그리드가 el-main 내부에서 남은 공간을 차지하도록 */
:deep(.el-main > .ctv-data-grid) {
    flex: 1;
    min-height: 0; /* Flex item height fix */
}
</style>
