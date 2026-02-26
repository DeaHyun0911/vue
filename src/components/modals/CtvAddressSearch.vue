<template>
  <div class="ctv-address-search-field">
    <!-- 트리거 슬롯: 이 슬롯이 있으면 기본 인풋 UI 대신 슬롯 사용 (독립 버튼 호출 지원) -->
    <slot name="trigger" :open="openModal">
      <!-- 우편번호 입력 + 검색 버튼 (기본 UI) -->
      <div class="ctv-addr-zip-row">
        <el-input
          :model-value="zipValue"
          readonly
          placeholder="우편번호"
          class="ctv-addr-zip-input"
          @click="openModal"
        >
          <template #append>
            <el-button :icon="Search" @click="openModal">우편번호 찾기</el-button>
          </template>
        </el-input>
      </div>

      <!-- 도로명 주소 (읽기 전용) -->
      <el-input
        v-if="addrField"
        :model-value="addrValue"
        placeholder="도로명 주소 (우편번호 찾기로 입력)"
        class="ctv-addr-road-input"
      />
    </slot>

    <!-- 주소 검색 모달 (공통) -->
    <ctv-modal
      v-model="visible"
      title="주소 검색"
      width="700px"
      top="8vh"
      :close-on-click-modal="true"
      append-to-body
      @close="handleClose"
    >
      <!-- 검색 영역 -->
      <div class="addr-search-bar">
        <el-input
          ref="keywordRef"
          v-model="keyword"
          placeholder="도로명, 건물명, 지번 입력 (예: 서울 강남 테헤란로)"
          clearable
          @keyup.enter="search"
        >
          <template #append>
            <el-button :icon="Search" @click="search" :loading="loading">검색</el-button>
          </template>
        </el-input>
      </div>

      <!-- 결과 리스트 -->
      <div class="addr-result-wrap">
        <div v-if="!searched" class="addr-guide">
          <el-icon class="guide-icon"><Location /></el-icon>
          <p>검색어를 입력하고 검색 버튼을 눌러주세요.</p>
        </div>

        <div v-else-if="results.length === 0 && !loading" class="addr-guide">
          <el-icon class="guide-icon"><WarningFilled /></el-icon>
          <p>검색 결과가 없습니다.</p>
          <p class="addr-guide-sub">다른 검색어로 다시 시도해주세요.</p>
        </div>

        <el-table
          v-else
          :data="results"
          height="340"
          stripe
          highlight-current-row
          @row-click="selectRow"
          @row-dblclick="selectRow"
          style="width: 100%"
          class="addr-result-table"
        >
          <el-table-column prop="zipNo" label="우편번호" width="90" align="center" />
          <el-table-column label="도로명 주소" min-width="280">
            <template #default="{ row }">
              <div class="addr-road">{{ row.roadAddr }}</div>
              <div class="addr-jibun">지번: {{ row.jibunAddr }}</div>
            </template>
          </el-table-column>
          <el-table-column label="" width="50" align="center">
            <template #default>
              <el-icon class="select-check-icon"><Check /></el-icon>
            </template>
          </el-table-column>
        </el-table>

        <!-- 페이지네이션 -->
        <div v-if="totalCount > pageSize" class="addr-pagination">
          <el-pagination
            small
            layout="prev, pager, next"
            :total="totalCount"
            :page-size="pageSize"
            v-model:current-page="currentPage"
            @current-change="search"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="visible = false">닫기</el-button>
      </template>
    </ctv-modal>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick } from 'vue';
import { Search, Location, WarningFilled, Check } from '@element-plus/icons-vue';

const props = defineProps({
  /** CtvForm model에서 우편번호를 채울 필드명 (field prop과 같은 값이 기본) */
  field: { type: String, default: null },
  /** 도로명 주소를 채울 모델 필드명 */
  addrField: { type: String, default: null },
  /** 영문 주소를 채울 모델 필드명 (선택) */
  engAddrField: { type: String, default: null },
  /** 지번 주소를 채울 모델 필드명 (선택) */
  jibunAddrField: { type: String, default: null },
  /** 행안부 API 인증키 (PopJuso.aspx의 키로 업데이트) */
  apiKey: { type: String, default: 'U01TX0FVVEgyMDIzMTEyMjEwNDYyOTExNDI5NzQ=' },
});

const emit = defineEmits(['select']);

// CtvForm의 formModel inject
const formModel = inject('formModel', null);

// 현재 model에서 우편번호/주소 읽기 (computed)
const zipValue = computed(() => {
  if (!formModel?.value || !props.field) return '';
  return formModel.value[props.field] || '';
});

const addrValue = computed(() => {
  if (!formModel?.value || !props.addrField) return '';
  return formModel.value[props.addrField] || '';
});

// ── 모달 상태 ──────────────────────────────────────────────
const visible = ref(false);
const keyword = ref('');
const keywordRef = ref(null);
const resolvePromise = ref(null); // Promise 기반 호출 지원용

/**
 * 모달 열기 (Promise 기반)
 * @returns {Promise<Object|null>} 선택된 주소 데이터 또는 닫을 시 null
 */
const open = () => {
  visible.value = true;
  nextTick(() => keywordRef.value?.focus());
  
  return new Promise((resolve) => {
    resolvePromise.value = resolve;
  });
};

/** 기존 호환성용 메서드 */
const openModal = () => {
  open();
};

// 외부에서 호출 가능하도록 노출
defineExpose({
  open,
  openModal
});

// ── 검색 상태 ──────────────────────────────────────────────
const results = ref([]);
const totalCount = ref(0);
const loading = ref(false);
const searched = ref(false);
const currentPage = ref(1);
const pageSize = 20;

// 모달 닫힐 때 처리
const handleClose = () => {
    if (resolvePromise.value) {
        resolvePromise.value(null);
        resolvePromise.value = null;
    }
    
    // 모달 닫힐 때 검색 기록 초기화
    keyword.value = '';
    results.value = [];
    searched.value = false;
    currentPage.value = 1;
};

// ── 주소 검색 ──────────────────────────────────────────────
const search = async () => {
  const kw = keyword.value.trim();
  if (!kw) return;

  if (/[%=><]/.test(kw)) {
    alert('특수문자를 입력할 수 없습니다.');
    return;
  }

  loading.value = true;
  searched.value = true;

  try {
    const params = new URLSearchParams({
      confmKey: props.apiKey,
      currentPage: currentPage.value,
      countPerPage: pageSize,
      keyword: kw,
      resultType: 'json',
    });

    const res = await fetch(
      `https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`
    );
    const json = await res.json();
    const { errorCode, errorMessage } = json.results.common;

    if (errorCode !== '0') {
      alert(`주소 검색 오류: ${errorMessage}`);
      results.value = [];
      totalCount.value = 0;
    } else {
      results.value = json.results.juso || [];
      totalCount.value = Number(json.results.common.totalCount) || 0;
    }
  } catch (e) {
    console.error('[CtvAddressSearch] API 호출 오류:', e);
    alert('주소 검색 서비스에 연결할 수 없습니다.');
    results.value = [];
  } finally {
    loading.value = false;
  }
};

// ── 주소 선택 ──────────────────────────────────────────────
const selectRow = (row) => {
  const resultData = {
    zipNo: row.zipNo,
    roadAddr: row.roadAddr,
    jibunAddr: row.jibunAddr,
    engAddr: row.engAddr,
    roadAddrPart1: row.roadAddrPart1,
    roadAddrPart2: row.roadAddrPart2,
  };

  // 1. CtvForm model에 자동 채우기 (컨텍스트가 있는 경우)
  if (formModel?.value) {
    const model = formModel.value;
    const fieldsToSync = [];
    
    if (props.field && props.field in model) {
      model[props.field] = row.zipNo;
      fieldsToSync.push(props.field);
    }
    if (props.addrField && props.addrField in model) {
      model[props.addrField] = row.roadAddr;
      fieldsToSync.push(props.addrField);
    }
    if (props.engAddrField && props.engAddrField in model) {
      model[props.engAddrField] = row.engAddr;
      fieldsToSync.push(props.engAddrField);
    }
    if (props.jibunAddrField && props.jibunAddrField in model) {
      model[props.jibunAddrField] = row.jibunAddr;
      fieldsToSync.push(props.jibunAddrField);
    }

    // 변경된 필드들을 그리드에 동기화하기 위해 블러 이벤트 발생
    if (typeof window !== 'undefined') {
      fieldsToSync.forEach(field => {
        window.dispatchEvent(new CustomEvent('ctv-form-field-blur', {
          detail: { formModel: model, field }
        }));
      });
    }
  }

  // 2. Promise resolve 처리 (독립 호출용)
  if (resolvePromise.value) {
    const resolve = resolvePromise.value;
    resolvePromise.value = null; // 중복 호출 방지
    resolve(resultData);
  }

  emit('select', resultData);

  visible.value = false;
  keyword.value = '';
  results.value = [];
  searched.value = false;
  currentPage.value = 1;
};
</script>

<style scoped>
.ctv-address-search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.ctv-addr-zip-input {
  width: 100%;
  cursor: pointer;
}

.ctv-addr-road-input {
  width: 100%;
  cursor: pointer;
}

/* 검색 모달 내부 */
.addr-search-bar {
  margin-bottom: 16px;
}

.addr-result-wrap {
  min-height: 360px;
}

.addr-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: #909399;
  gap: 8px;
}

.guide-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.addr-guide-sub {
  font-size: 12px;
  color: #c0c4cc;
}

.addr-road {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
}

.addr-jibun {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.addr-pagination {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

/* 결과 테이블 커스텀 */
.addr-result-table :deep(.el-table__row) {
  cursor: pointer;
}

.select-check-icon {
  font-size: 18px;
  color: #409eff;
  opacity: 0;
  transition: opacity 0.2s;
}

.addr-result-table :deep(.el-table__row:hover) .select-check-icon {
  opacity: 1;
}
</style>
