<template>
  <div class="ctv-tabs">
    <!-- 우측 툴바용 슬롯 -->
    <div v-if="$slots.toolbar" class="ctv-tabs-toolbar">
      <slot name="toolbar"></slot>
    </div>

    <el-tabs 
      v-model="activeName" 
      :type="type" 
      :tab-position="tabPosition"
      :stretch="stretch"
      @tab-click="handleTabClick"
      @tab-remove="handleTabRemove"
      @tab-add="handleTabAdd"
      :editable="editable"
      :addable="addable"
      :closable="closable"
    >
      <!-- Items Prop이 제공된 경우 데이터 기반 렌더링 -->
      <template v-if="items && items.length > 0">
        <el-tab-pane
          v-for="item in items"
          :key="item.name"
          :label="item.label"
          :name="item.name"
          :disabled="item.disabled"
          :closable="item.closable"
          :lazy="item.lazy"
        >
          <!-- 탭 라벨 커스텀 슬롯 -->
          <template #label v-if="$slots[`label-${item.name}`]">
            <slot :name="`label-${item.name}`" :item="item"></slot>
          </template>
          
          <!-- 탭 콘텐츠 -->
          <!-- 1. Content 슬롯 -->
          <slot v-if="$slots[item.name]" :name="item.name" :item="item"></slot>
          
          <!-- 2. component 속성이 있는 경우 동적 컴포넌트 렌더링 -->
          <component 
            v-else-if="item.component" 
            :is="item.component" 
            v-bind="item.props || {}"
          />
          
          <!-- 3. 단순 텍스트/HTML -->
          <div v-else-if="item.content" v-html="item.content"></div>
        </el-tab-pane>
      </template>

      <!-- 기본 슬롯 (직접 el-tab-pane 작성 시) -->
      <slot v-else></slot>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { ElTabs, ElTabPane } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  /**
   * 탭 스타일 타입: card, border-card, ''
   */
  type: {
    type: String,
    default: ''
  },
  /**
   * 탭 위치: top, right, bottom, left
   */
  tabPosition: {
    type: String,
    default: 'top'
  },
  /**
   * 탭 너비 자동 맞춤
   */
  stretch: {
    type: Boolean,
    default: false
  },
  /**
   * 탭 목록 데이터
   * [{ label: 'Tab 1', name: 'first', content: '...', component: Comp, props: {}, disabled: false }]
   */
  items: {
    type: Array,
    default: () => []
  },
  editable: {
    type: Boolean,
    default: false
  },
  addable: {
    type: Boolean,
    default: false
  },
  closable: {
    type: Boolean,
    default: false
  },
});

const emit = defineEmits(['update:modelValue', 'tab-click', 'tab-remove', 'tab-add', 'edit']);

const activeName = computed({
  // modelValue가 없으면 undefined를 반환하여 el-tabs가 첫 번째 탭을 자동 선택하게 함
  get: () => props.modelValue || undefined,
  set: (val) => emit('update:modelValue', val)
});

const handleTabClick = (pane, ev) => {
  emit('tab-click', pane, ev);
};

const handleTabRemove = (name) => {
  emit('tab-remove', name);
  emit('edit', name, 'remove');
};

const handleTabAdd = () => {
  emit('tab-add');
  emit('edit', null, 'add');
};

// 첫 번째 탭 자동 선택 로직 (modelValue가 비어있고 items가 있을 때)
const selectFirstTab = () => {
  // 이미 값이 있거나 아이템이 없으면 패스
  if (props.modelValue || !props.items || props.items.length === 0) return;
  
  const firstItem = props.items[0];
  if (firstItem && firstItem.name) {
    emit('update:modelValue', firstItem.name);
  }
};

watch(() => props.items, () => {
  selectFirstTab();
}, { deep: true });

onMounted(() => {
  selectFirstTab();
});


</script>

<style scoped>
.ctv-tabs {
  width: 100%;
  position: relative;
}

.ctv-tabs-toolbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 40px; /* el-tabs 기본 헤더 높이와 맞춤 (필요시 조정) */
}
</style>
