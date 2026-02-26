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
import { useFileUpload } from '../composables/useFileUpload';
import { ElMessage, ElLoading } from 'element-plus';
import { pendingUploads } from '../utils/pendingUploads.js';

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

  // 업로드 제한 (uploadConfig 없을 때 사용되는 레거시 props)
  accept: { type: String, default: 'image/*' },
  maxSizeKb: { type: Number, default: 2048 }, // 2MB
  showDeleteButton: { type: Boolean, default: true },

  // 상태
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },

  // ── 서버 업로드 설정 (FileUploadApi.ashx 연동) ──
  // uploadConfig: { folder2, folder3, folder4Field?, folder5?, accept?, maxSizeMb?, ashxUrl? }
  uploadConfig: { type: Object, default: null },
  // dbSaveConfig: { ashxUrl?, action, idField }
  dbSaveConfig:  { type: Object, default: null },
  // deleteConfig: { ashxUrl?, action, idField }
  deleteConfig:  { type: Object, default: null },
  // 현재 행 데이터 (folder4Field 등의 동적 값 추출용)
  focusData:     { type: Object, default: null },
  // 이미지 기본 URL (서버 업로드 모드에서 이미지 표시에 사용)
  baseUrl:       { type: String, default: '../../cwwsFiles/' },
});

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus', 'uploaded', 'deleted']);

const { innerValue, onFormFieldBlur } = useFormField(props, emit);
const { upload, saveToDb, deleteFile, buildImageUrl } = useFileUpload();

// -- 내부 상태 --
const fileInputRef = ref(null);
const isHover = ref(false);
const isDragging = ref(false);
const localPreviewUrl = ref(null); // 로컬 File 선택 시 ObjectURL (Base64 모드)
const serverUploading = ref(false);
const lastInternalValue = ref(''); // 외부 변경 감지용 (다른 행 클릭 시 초기화하기 위함)

// 표시할 이미지 URL 결정
// 우선순위: localPreviewUrl(방금 선택) > base64 직접 > buildImageUrl(서버 경로)
const currentSrc = computed(() => {
  // 방금 선택한 파일의 ObjectURL 최우선
  if (localPreviewUrl.value) return localPreviewUrl.value;

  if (!innerValue.value) return null;

  // Base64 데이터(data:image/...)이면 그대로 반환
  if (typeof innerValue.value === 'string' && innerValue.value.startsWith('data:')) {
    return innerValue.value;
  }

  // 서버 경로 조합 (uploadConfig 있고, deferUpload 아닌 경우 또는 파일명인 경우)
  if (props.uploadConfig && innerValue.value) {
    return buildImageUrl(innerValue.value, props.uploadConfig, props.focusData, props.baseUrl);
  }

  return innerValue.value || null;
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
  maxWidth: '100%',
  maxHeight: '100%',
  display: 'block',
}));

// -- 이벤트 핸들러 --
const triggerUpload = () => {
  if (props.disabled || props.readonly) return;
  fileInputRef.value?.click();
};

// ── 서버 업로드 모드 처리 ───────────────────────────────────────────
const processFileServer = async (file) => {
  if (!file) return;

  // 업로드 직전 로컬 미리보기 즉시 표시
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  localPreviewUrl.value = URL.createObjectURL(file);

  serverUploading.value = true;
  const loadingInst = ElLoading.service({ text: '업로드 중...', background: 'rgba(0,0,0,0.4)' });

  try {
    // 1. FileUploadApi.ashx 로 물리 파일 업로드
    const uploadCfg = {
      ...props.uploadConfig,
      ashxUrl: props.uploadConfig.ashxUrl || '../../cwwsCom/NewFileUpload/FileUploadApi.ashx',
    };
    const result = await upload(file, uploadCfg, props.focusData);
    const savedFileName = result.NM_FILE;

    // 2. DB 저장 (dbSaveConfig 가 있을 때만)
    if (props.dbSaveConfig) {
      const saveCfg = {
        ...props.dbSaveConfig,
        dbSaveAshxUrl: props.dbSaveConfig.ashxUrl || 'FileUpLoad.ashx',
        dbSaveAction:  props.dbSaveConfig.action,
        folder2: props.uploadConfig.folder2,
        folder3: props.uploadConfig.folder3,
      };
      await saveToDb(savedFileName, saveCfg, props.focusData);
    }

    // 3. 모델 값 업데이트 (파일명만 저장 → UfnSave에서 DB 반영)
    innerValue.value = savedFileName;
    lastInternalValue.value = savedFileName;
    emit('change',   { file, filename: savedFileName });
    emit('uploaded', { file, filename: savedFileName });
    onFormFieldBlur();
    ElMessage.success('파일이 업로드되었습니다.');
  } catch (err) {
    // 업로드 실패 시 로컬 미리보기 초기화
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = null;
    ElMessage.error(err.message || '업로드 중 오류가 발생했습니다.');
  } finally {
    serverUploading.value = false;
    loadingInst.close();
  }
};

// ── Base64 로컬 모드 처리 (uploadConfig 없을 때 또는 deferUpload 모드) ──────
const processFileLocal = (file) => {
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

  const isDeferUpload = props.uploadConfig?.deferUpload === true;

  if (isDeferUpload) {
    // ── deferUpload 모드 (Binary 방식) ─────────────────────────────────
    // form model(innerValue)에는 파일명만 저장 → 그리드/폼에서 깔끔하게 표시
    // File 객체는 pendingUploads 레지스트리에 보관
    // → CtvDataGrid.save()에서 직접 FileUploadApi 업로드 후 실제 파일명을 aSaveData에 주입
    if (props.field) {
      pendingUploads.set(props.field, file, props.uploadConfig, props.focusData);
    }
    innerValue.value = file.name; // 파일명만 모델에 저장
    lastInternalValue.value = file.name;
    emit('change', { file, filename: file.name });
    onFormFieldBlur();
  } else {
    // ── 순수 로컬 Base64 모드 (uploadConfig 없음) ────────────────
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      innerValue.value = base64;
      lastInternalValue.value = base64;
      emit('change', { file, base64 });
      onFormFieldBlur();
    };
    reader.readAsDataURL(file);
  }
};

const processFile = (file) => {
  // deferUpload: true 이면 서버 업로드 없이 Base64로 저장
  if (props.uploadConfig && !props.uploadConfig.deferUpload) {
    processFileServer(file);
  } else {
    processFileLocal(file);
  }
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

const clearImage = async () => {
  // 서버 삭제 (deleteConfig 가 있을 때만)
  if (props.uploadConfig && props.deleteConfig && innerValue.value) {
    const loadingInst = ElLoading.service({ text: '삭제 중...' });
    try {
      const delCfg = {
        ...props.deleteConfig,
        deleteAshxUrl: props.deleteConfig.ashxUrl || 'FileUpLoad.ashx',
        deleteAction:  props.deleteConfig.action,
        folder2: props.uploadConfig.folder2,
        folder3: props.uploadConfig.folder3,
      };
      await deleteFile(innerValue.value, delCfg, props.focusData);
      ElMessage.success('파일이 삭제되었습니다.');
    } catch (err) {
      ElMessage.error(err.message || '삭제 중 오류');
      return;
    } finally {
      loadingInst.close();
    }
  }

  // deferUpload 대기 중인 파일도 레지스트리에서 제거
  if (props.uploadConfig?.deferUpload && props.field) {
    pendingUploads.delete(props.field);
  }

  // 로컬 미리보기 + 모델 초기화
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = null;
  }
  innerValue.value = '';
  lastInternalValue.value = '';
  emit('change',  { file: null, base64: '' });
  emit('deleted', {});
  onFormFieldBlur();
};

const onImgError = () => {
  // 서버 URL 이미지 로드 실패 시 조용히 처리
};

// modelValue 외부 변경 시 로컬 미리보기 초기화 (예: 다른 행 클릭)
watch(() => innerValue.value, (newVal) => {
  if (newVal !== lastInternalValue.value) {
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
      localPreviewUrl.value = null;
    }
    // 다른 행 클릭 시 보류 중이던 업로드 파일도 폐기
    if (props.uploadConfig?.deferUpload && props.field) {
      pendingUploads.delete(props.field);
    }
  }
  lastInternalValue.value = newVal || '';
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
  padding: 8px; /* 프리뷰 여백 추가 */
  box-sizing: border-box;
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
  /* props.imgStyle에서 max-width/height 제어 */
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
