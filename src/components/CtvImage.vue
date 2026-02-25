<template>
  <div 
    class="ctv-image-wrapper"
    :class="{ 
      'is-circle': shape === 'circle', 
      'is-disabled': disabled,
      'is-hover': isHover 
    }"
    :style="wrapperStyle"
    @click="!disabled && triggerUpload()"
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
    @dragover.prevent="!disabled && (isDragging = true)"
    @dragleave="isDragging = false"
    @drop.prevent="!disabled && onDrop($event)"
    :title="disabled ? '' : '클릭하거나 이미지를 드래그하여 업로드'"
  >
    <!-- 이미지 표시 영역 -->
    <div class="ctv-image-preview" :class="{ 'is-dragging': isDragging }">
      <!-- 이미지가 있을 때 -->
      <img 
        v-if="currentSrc" 
        :src="currentSrc" 
        :alt="alt || title"
        class="ctv-image-img"
        :style="imgStyle"
        @error="onImgError"
      />
      <!-- 이미지가 없을 때 플레이스홀더 -->
      <div v-else class="ctv-image-placeholder">
        <el-icon :size="iconSize"><component :is="placeholderIcon" /></el-icon>
        <span v-if="placeholderText" class="ctv-image-placeholder-text">{{ placeholderText }}</span>
      </div>
      <!-- 호버 오버레이 (수정 가능 상태) -->
      <div v-if="!disabled" class="ctv-image-overlay">
        <el-icon :size="18"><Camera /></el-icon>
        <span>{{ currentSrc ? '변경' : '업로드' }}</span>
      </div>
    </div>

    <!-- 하단 액션 버튼 (삭제) -->
    <div v-if="currentSrc && !disabled && showDeleteButton" class="ctv-image-actions">
      <el-button 
        type="danger" 
        size="small" 
        plain
        @click.stop="clearImage"
        :icon="Delete"
      >삭제</el-button>
    </div>

    <!-- hidden input -->
    <input 
      ref="fileInputRef"
      type="file" 
      :accept="accept"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Camera, Delete, Picture, UserFilled, Stamp } from '@element-plus/icons-vue';
import { useFormField } from '../composables/useFormField';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: { type: String, default: '' },
  field: { type: String, default: null },
  title: { type: String, default: '이미지' },
  alt: { type: String, default: '' },

  // 모양 및 크기
  shape: { 
    type: String, 
    default: 'square',
    validator: v => ['square', 'circle'].includes(v)
  },
  width: { type: [String, Number], default: 110 },
  height: { type: [String, Number], default: 110 },

  // 표시 옵션
  fit: {
    type: String,
    default: 'contain',
    validator: v => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(v)
  },
  icon: { type: String, default: null }, // 'user' | 'stamp' | 'picture' | null
  placeholderText: { type: String, default: '이미지 없음' },

  // 업로드 제한
  accept: { type: String, default: 'image/*' },
  maxSizeKb: { type: Number, default: 2048 }, // 2MB
  showDeleteButton: { type: Boolean, default: true },

  // 상태
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);

// -- 내부 상태 --
const fileInputRef = ref(null);
const isHover = ref(false);
const isDragging = ref(false);
const localPreviewUrl = ref(null); // 로컬 File 선택 시 ObjectURL

// 표시할 이미지 URL 결정
// 우선순위: 로컬 미리보기 > innerValue (form model or v-model)
const currentSrc = computed(() => {
  return localPreviewUrl.value || innerValue.value || null;
});

// 플레이스홀더 아이콘 결정
const placeholderIcon = computed(() => {
  if (props.icon === 'user') return UserFilled;
  if (props.icon === 'stamp') return Stamp;
  return Picture;
});

const iconSize = computed(() => {
  const w = parseInt(props.width) || 140;
  return Math.min(w * 0.3, 48);
});

// 스타일 계산
const formatSize = (v) => (typeof v === 'number' || !isNaN(v)) ? `${v}px` : v;

const wrapperStyle = computed(() => ({
  width: formatSize(props.width),
  minHeight: formatSize(props.height),
  cursor: props.disabled ? 'default' : 'pointer',
}));

const imgStyle = computed(() => ({
  objectFit: props.fit,
  width: '100%',
  height: '100%',
  display: 'block',
}));

// -- 이벤트 핸들러 --
const triggerUpload = () => {
  if (props.disabled || props.readonly) return;
  fileInputRef.value?.click();
};

const processFile = (file) => {
  if (!file) return;

  // 타입 체크
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('이미지 파일만 업로드할 수 있습니다.');
    return;
  }
  // 용량 체크
  if (props.maxSizeKb && file.size > props.maxSizeKb * 1024) {
    ElMessage.warning(`파일 크기는 ${props.maxSizeKb}KB 이하여야 합니다.`);
    return;
  }

  // ObjectURL로 즉시 미리보기
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  localPreviewUrl.value = URL.createObjectURL(file);

  // Base64로 변환하여 form model에 저장
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    innerValue.value = base64;
    emit('change', { file, base64 });
    onFormFieldBlur();
  };
  reader.readAsDataURL(file);
};

const onFileChange = (e) => {
  const file = e.target.files?.[0];
  processFile(file);
  // 같은 파일 재선택 허용
  e.target.value = '';
};

const onDrop = (e) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  processFile(file);
};

const clearImage = () => {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = null;
  }
  innerValue.value = '';
  emit('change', { file: null, base64: '' });
  onFormFieldBlur();
};

const onImgError = () => {
  // 서버 URL 이미지 로드 실패 시 로컬 미리보기로 대체
  // (base64이면 에러 거의 안 남)
};

// modelValue 외부 변경 시 로컬 미리보기 초기화
watch(() => innerValue.value, (newVal) => {
  // 외부에서 값이 비워지면 로컬 미리보기도 초기화
  if (!newVal && localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = null;
  }
});

defineExpose({ clearImage, triggerUpload, currentSrc });
</script>

<style scoped>
.ctv-image-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  user-select: none;
}

/* 미리보기 영역 */
.ctv-image-preview {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 100px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  background-color: #fafafa;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, background-color 0.2s;
}

/* 원형 */
.ctv-image-wrapper.is-circle .ctv-image-preview {
  border-radius: 50%;
  aspect-ratio: 1;
}

/* 마우스 호버 */
.ctv-image-wrapper:not(.is-disabled):hover .ctv-image-preview {
  border-color: #409eff;
  background-color: #f0f7ff;
}

/* 드래그 중 */
.ctv-image-preview.is-dragging {
  border-color: #409eff;
  background-color: #ecf5ff;
}

/* 이미지 */
.ctv-image-img {
  width: 100%;
  height: 100%;
  display: block;
}

/* 플레이스홀더 */
.ctv-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #c0c4cc;
  padding: 16px;
  text-align: center;
}

.ctv-image-placeholder .ctv-image-placeholder-text {
  font-size: 12px;
  color: #c0c4cc;
  line-height: 18px;
  word-break: keep-all;
}

/* 오버레이 (호버 시 표시) */
.ctv-image-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: inherit;
}

.ctv-image-wrapper:not(.is-disabled):hover .ctv-image-overlay {
  opacity: 1;
}

/* 비활성화 */
.ctv-image-wrapper.is-disabled .ctv-image-preview {
  border-style: solid;
  cursor: not-allowed;
  background-color: #f5f7fa;
}

/* 하단 버튼 영역 */
.ctv-image-actions {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
