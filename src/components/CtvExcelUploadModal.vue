<template>
  <el-dialog
    v-model="internalVisible"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    class="ctv-excel-upload-modal"
    @closed="handleClosed"
  >
    <div class="upload-container">
      <!-- 파일 업로드 영역 -->
      <el-upload
        class="upload-area"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :on-remove="handleRemove"
        :limit="1"
        :file-list="fileList"
        accept=".xls,.xlsx"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          파일을 이곳으로 드래그하거나 <em>클릭하여 선택하세요</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            <span style="color:#e6a23c; font-weight:bold;">xls, xlsx</span> 확장자의 파일만 업로드할 수 있습니다.
          </div>
        </template>
      </el-upload>
    </div>

    <!-- 샘플 다운로드 버튼 -->
    <div class="upload-actions">
        <el-button v-if="sampleUrl || sampleName" plain @click="downloadSample" icon="Download">
            샘플 양식 다운로드
        </el-button>
        <slot name="extra-actions"></slot>
    </div>

    <!-- 업로드 안내사항 -->
    <!-- <div v-if="instructions && instructions.length" class="upload-instructions">
    <h4><el-icon><InfoFilled /></el-icon> 업로드 안내사항</h4>
    <ul>
        <li v-for="(text, index) in instructions" :key="index">{{ text }}</li>
    </ul>
    </div> -->

    <!-- 푸터 버튼부 -->
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="internalVisible = false">취소</el-button>
        <el-button type="primary" @click="handleUpload" :disabled="!isReadyToUpload" :loading="uploading">
          업로드
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '엑셀 일괄 등록'
  },
  width: {
    type: String,
    default: '600px'
  },
  sampleUrl: {
    type: String,
    default: ''
  },
  sampleName: {
    type: String,
    default: ''
  },
  samplePath: {
    type: String,
    default: './Sample_Excel_Files/'
  },
  instructions: {
    type: Array,
    default: () => [
      '다운로드 받은 샘플 양식을 변경하지 말고 데이터를 입력해주세요.',
      '양식 내 필수 입력 항목을 모두 작성해야 합니다.',
      '등록 시 기존 데이터에 추가/수정으로 반영됩니다.'
    ]
  },
  uploading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'upload']);

const internalVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const fileList = ref([]);
const fileRaw = ref(null);

const isReadyToUpload = computed(() => {
  return fileList.value.length > 0 && fileRaw.value !== null;
});

const handleFileChange = (uploadFile, uploadFiles) => {
  // limit=1 이지만 이전 파일을 덮어쓰기 위해 로직 추가
  if (uploadFiles.length > 1) {
    uploadFiles.splice(0, 1);
  }
  fileList.value = uploadFiles;
  fileRaw.value = uploadFile.raw;
};

const handleRemove = (file, uploadFiles) => {
  fileList.value = uploadFiles;
  fileRaw.value = null;
};

const handleClosed = () => {
    // 닫힐 때 파일 목록 초기화
    fileList.value = [];
    fileRaw.value = null;
};

const downloadSample = () => {
  if (props.sampleUrl) {
    window.location.href = props.sampleUrl;
  } else if (props.sampleName) {
    const fullPath = props.samplePath + props.sampleName;
    
    if (typeof ufnSaveToDisk === 'function') {
        ufnSaveToDisk(fullPath, props.sampleName);
    } else {
        console.error('[CtvExcelUploadModal] ufnSaveToDisk 함수를 찾을 수 없습니다.');
        if(window.Ctv && window.Ctv.ctvAlert) {
            window.Ctv.ctvAlert('파일 다운로드 기능을 사용할 수 없습니다. (ufnSaveToDisk 미정의)', '알림');
        }
    }
  } else {
    // 경고
    if(window.Ctv && window.Ctv.ctvAlert) {
        window.Ctv.ctvAlert('설정된 샘플 파일이 없습니다.');
    }
  }
};

const handleUpload = () => {
  if (isReadyToUpload.value) {
    // 상위 컴포넌트로 File 객체 전달
    emit('upload', fileRaw.value);
  }
};
</script>

<style scoped>
.ctv-excel-upload-modal .upload-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.upload-instructions {
  background-color: #f4f6f8;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  margin-top: 10px;
}
.upload-instructions h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #303133;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.upload-instructions ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.upload-area {
  width: 100%;
}
.upload-area :deep(.el-upload-dragger) {
  width: 100%;
}
</style>
