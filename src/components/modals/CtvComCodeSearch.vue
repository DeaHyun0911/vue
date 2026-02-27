<template>
  <div class="ctv-com-code-search-field" ref="fieldRef">
    <slot name="trigger" :open="open">
      <div class="ctv-com-wrapper" ref="wrapperRef">
        <div class="ctv-com-group">

          <!-- 코드 필드 -->
          <div class="ctv-com-group-item ctv-com-code-wrap" :style="{ flex: `0 0 ${codeWidth}` }">
            <el-input
              ref="codeInputRef"
              v-model="inputCode"
              :placeholder="codePlaceholder"
              :disabled="codeDisabled"
              class="ctv-com-input"
              @input="(v) => handleInput(v, 'CD')"
              @keyup.enter="open({ initCode: inputCode })"
              @blur="onBlur"
              @focus="onFocus"
            />
          </div>

          <!-- 명칭 필드 -->
          <div v-if="nameField" class="ctv-com-group-item ctv-com-name-wrap">
            <el-input
              v-model="inputName"
              :placeholder="`${codeLabel}명`"
              :disabled="nameDisabled"
              class="ctv-com-input"
              @input="(v) => handleInput(v, 'NM')"
              @blur="onBlur"
              @focus="onFocus"
            />
          </div>

          <!-- REF1 필드 -->
          <div v-if="ref1Field" class="ctv-com-group-item ctv-com-ref-wrap">
            <el-input
              v-model="inputRef1"
              :placeholder="ref1Placeholder"
              :disabled="ref1Disabled"
              class="ctv-com-input"
              @input="(v) => handleInput(v, 'REF1')"
              @blur="onBlur"
              @focus="onFocus"
            />
          </div>

          <!-- REF2 필드 -->
          <div v-if="ref2Field" class="ctv-com-group-item ctv-com-ref-wrap">
            <el-input
              v-model="inputRef2"
              :placeholder="ref2Placeholder"
              :disabled="ref2Disabled"
              class="ctv-com-input"
              @input="(v) => handleInput(v, 'REF2')"
              @blur="onBlur"
              @focus="onFocus"
            />
          </div>

        </div>

        <!-- 🔍 팝업 열기 버튼 -->
        <button
          class="ctv-com-popup-btn"
          type="button"
          @mousedown.prevent
          @click="open()"
          :title="`${codeLabel} 상세 검색`"
        >
          <el-icon><Search /></el-icon>
        </button>
      </div>

      <!-- ✅ 공통 드롭다운: 항상 wrapper 왼쪽 기준, 전체 너비 -->
      <div
        v-if="dropdownVisible && dropdownItems.length"
        class="ctv-com-dropdown"
        @mousedown.prevent
      >
        <div
          v-for="(item, idx) in dropdownItems"
          :key="idx"
          class="ctv-com-dropdown-item"
          @click="selectRow(item)"
        >
          <span class="ac-code-cell" :style="{ width: codeWidth }">{{ item.CD_DTL }}</span>
          <span class="ac-name-cell">{{ item.NM_CODE }}</span>
          <span v-if="ref1Field" class="ac-ref-cell">{{ item.REF1 }}</span>
          <span v-if="ref2Field" class="ac-ref-cell">{{ item.REF2 }}</span>
        </div>
      </div>
    </slot>

    <!-- 공통코드 검색 모달 -->
    <ctv-modal
      v-model="visible"
      :title="`${codeLabel} 검색`"
      width="680px"
      top="8vh"
      :close-on-click-modal="true"
      append-to-body
      @close="handleClose"
    >
      <div class="com-search-bar">
        <el-input
          ref="modalCodeRef"
          v-model="searchCode"
          :placeholder="`${codeLabel} 코드`"
          clearable
          class="com-search-code"
          @keyup.enter="search"
        />
        <el-input
          v-model="searchName"
          :placeholder="`${codeLabel} 명칭`"
          clearable
          class="com-search-name"
          @keyup.enter="search"
        >
          <template #append>
            <el-button :icon="Search" @click="search" :loading="loading">검색</el-button>
          </template>
        </el-input>
      </div>

      <div class="com-result-wrap">
        <div v-if="!searched" class="com-guide">
          <el-icon class="guide-icon"><Search /></el-icon>
          <p>코드 또는 명칭을 입력하고 Enter 또는 검색 버튼을 눌러주세요.</p>
        </div>
        <div v-else-if="results.length === 0 && !loading" class="com-guide">
          <el-icon class="guide-icon"><WarningFilled /></el-icon>
          <p>검색 결과가 없습니다.</p>
          <p class="com-guide-sub">다른 검색어로 다시 시도해주세요.</p>
        </div>
        <el-table
          v-else
          :data="results"
          height="360"
          stripe
          highlight-current-row
          @row-click="selectRow"
          @row-dblclick="selectRow"
          style="width: 100%"
          class="com-result-table"
        >
          <el-table-column prop="CD_DTL"  :label="`${codeLabel} 코드`" width="130" align="center" />
          <el-table-column prop="NM_CODE" :label="`${codeLabel} 명칭`" min-width="180" />
          <el-table-column v-if="ref1Field" prop="REF1" :label="ref1Placeholder" width="130" align="center" />
          <el-table-column v-if="ref2Field" prop="REF2" :label="ref2Placeholder" width="130" align="center" />
          <el-table-column label="" width="44" align="center">
            <template #default>
              <el-icon class="select-check-icon"><Check /></el-icon>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="visible = false">닫기</el-button>
      </template>
    </ctv-modal>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, watch } from 'vue';
import { Search, WarningFilled, Check } from '@element-plus/icons-vue';

const props = defineProps({
  codeType:        { type: String,  required: true },
  codeLabel:       { type: String,  default: '코드' },
  field:           { type: String,  default: null },
  nameField:       { type: String,  default: null },
  ref1Field:       { type: String,  default: null },
  ref1Placeholder: { type: String,  default: '참조1' },
  ref2Field:       { type: String,  default: null },
  ref2Placeholder: { type: String,  default: '참조2' },
  codePlaceholder: { type: String,  default: '코드' },
  codeWidth:       { type: String,  default: '140px' },
  ref1Filter:      { type: String,  default: '' },
  codeDisabled:    { type: Boolean, default: false },
  nameDisabled:    { type: Boolean, default: false },
  ref1Disabled:    { type: Boolean, default: false },
  ref2Disabled:    { type: Boolean, default: false },
});

const emit = defineEmits(['select']);
const formModel = inject('formModel', null);

const codeValue = computed(() => formModel?.value?.[props.field]    || '');
const nameValue = computed(() => formModel?.value?.[props.nameField] || '');
const ref1Value = computed(() => formModel?.value?.[props.ref1Field] || '');
const ref2Value = computed(() => formModel?.value?.[props.ref2Field] || '');

const inputCode = ref('');
const inputName = ref('');
const inputRef1 = ref('');
const inputRef2 = ref('');

watch(codeValue, (v) => { inputCode.value = v; }, { immediate: true });
watch(nameValue, (v) => { inputName.value = v; }, { immediate: true });
watch(ref1Value, (v) => { inputRef1.value = v; }, { immediate: true });
watch(ref2Value, (v) => { inputRef2.value = v; }, { immediate: true });

// ── 커스텀 드롭다운 상태 ──────────────────────────────────
const dropdownItems   = ref([]);
const dropdownVisible = ref(false);
let searchTimer = null;
let hideTimer   = null;

const onFocus = () => {
  clearTimeout(hideTimer);
  if (dropdownItems.value.length) dropdownVisible.value = true;
};

const onBlur = () => {
  hideTimer = setTimeout(() => { dropdownVisible.value = false; }, 150);
};

// 공통 API 호출
const callApi = async (code, name, flag) => {
  const bParam = [top.gSInfo?.[ERPSDB] ?? '', props.codeType, code, name, flag, props.ref1Filter];
  const rjSon = await ufnXhrDotNetCaller04(true, '../cPop/PopComs.ashx', ['UfnQuery', ''], bParam);
  if (rjSon.ErrorCode === '' && rjSon.rsData01?.length > 0) return JSON.parse(rjSon.rsData01);
  return [];
};

const handleInput = (query, flag) => {
  clearTimeout(searchTimer);
  if (!query) { dropdownItems.value = []; dropdownVisible.value = false; return; }

  searchTimer = setTimeout(async () => {
    try {
      let list;
      if (flag === 'CD' || flag === 'NM') {
        list = await callApi(flag === 'CD' ? query : '', flag === 'NM' ? query : '', flag);
      } else {
        // REF1 / REF2: 전체 조회 후 클라이언트 필터
        const all = await callApi('', '', 'NM');
        list = all.filter(r => (r[flag] || '').toLowerCase().includes(query.toLowerCase()));
      }
      dropdownItems.value   = list.slice(0, 20);
      dropdownVisible.value = dropdownItems.value.length > 0;
    } catch {
      dropdownItems.value   = [];
      dropdownVisible.value = false;
    }
  }, 250);
};

// ── 모달 상태 ────────────────────────────────────────────
const visible      = ref(false);
const searchCode   = ref('');
const searchName   = ref('');
const modalCodeRef = ref(null);
const resolvePromise = ref(null);

const open = (options = {}) => {
  dropdownVisible.value = false;
  searchCode.value = options.initCode ?? inputCode.value;
  searchName.value = options.initName ?? '';
  results.value    = [];
  searched.value   = false;
  visible.value    = true;
  nextTick(() => {
    modalCodeRef.value?.focus();
    if (searchCode.value || searchName.value) search();
  });
  return new Promise((resolve) => { resolvePromise.value = resolve; });
};

const openModal = () => open();
defineExpose({ open, openModal });

// ── 검색 상태 (모달) ──────────────────────────────────────
const results  = ref([]);
const loading  = ref(false);
const searched = ref(false);

const handleClose = () => {
  if (resolvePromise.value) { resolvePromise.value(null); resolvePromise.value = null; }
  searchCode.value = ''; searchName.value = '';
  results.value = []; searched.value = false;
};

const search = async () => {
  loading.value = true; searched.value = true;
  try {
    results.value = await callApi(
      searchCode.value.trim(),
      searchName.value.trim(),
      searchCode.value.trim() ? 'CD' : 'NM',
    );
  } catch { results.value = []; }
  finally { loading.value = false; }
};

// ── 행 선택 ───────────────────────────────────────────────
const selectRow = (row) => {
  dropdownVisible.value = false;

  if (formModel?.value) {
    const model = formModel.value;
    const fieldsToSync = [];
    const setField = (key, val) => {
      if (key && key in model) { model[key] = val ?? ''; fieldsToSync.push(key); }
    };
    setField(props.field,     row.CD_DTL);
    setField(props.nameField, row.NM_CODE);
    setField(props.ref1Field, row.REF1);
    setField(props.ref2Field, row.REF2);

    inputCode.value = row.CD_DTL  ?? '';
    inputName.value = row.NM_CODE ?? '';
    inputRef1.value = row.REF1    ?? '';
    inputRef2.value = row.REF2    ?? '';

    if (typeof window !== 'undefined') {
      fieldsToSync.forEach((field) => {
        window.dispatchEvent(new CustomEvent('ctv-form-field-blur', {
          detail: { formModel: model, field },
        }));
      });
    }
  }

  if (resolvePromise.value) {
    const resolve = resolvePromise.value;
    resolvePromise.value = null;
    resolve(row);
  }

  emit('select', row);
  visible.value = false;
};

const syncCodeFromInput = () => {
  if (formModel?.value && props.field && props.field in formModel.value) {
    if (formModel.value[props.field] !== inputCode.value) {
      formModel.value[props.field] = inputCode.value;
      window.dispatchEvent(new CustomEvent('ctv-form-field-blur', {
        detail: { formModel: formModel.value, field: props.field },
      }));
    }
  }
};
</script>

<style scoped>
/* ── 전체 필드 컨테이너 ── */
.ctv-com-code-search-field {
  position: relative; /* 드롭다운 기준점 */
  width: 100%;
}

/* ── Wrapper ── */
.ctv-com-wrapper {
  display: flex;
  align-items: stretch;
  width: 100%;
}

/* ── Input group ── */
.ctv-com-group {
  display: flex;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-right: none;
  border-radius: var(--el-border-radius-base, 4px) 0 0 var(--el-border-radius-base, 4px);
  overflow: hidden;
  transition: border-color 0.2s;
}

.ctv-com-wrapper:focus-within .ctv-com-group {
  border-color: var(--el-color-primary, #409eff);
}

.ctv-com-group-item {
  flex: 1;
  min-width: 0;
  position: relative;
}

.ctv-com-code-wrap { flex-shrink: 0; }

.ctv-com-name-wrap,
.ctv-com-ref-wrap {
  flex: 1;
}

.ctv-com-group-item + .ctv-com-group-item::before {
  content: '';
  position: absolute;
  top: 20%; left: 0;
  height: 60%; width: 1px;
  background: var(--el-border-color, #dcdfe6);
  z-index: 1;
}

/* 인풋: 외부 border 제거 */
.ctv-com-group :deep(.el-input__wrapper) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* ── 팝업 버튼 ── */
.ctv-com-popup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  flex-shrink: 0;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 0 var(--el-border-radius-base, 4px) var(--el-border-radius-base, 4px) 0;
  color: var(--el-text-color-regular, #606266);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  padding: 0;
}

.ctv-com-popup-btn:hover {
  background: var(--el-color-primary-light-9, #ecf5ff);
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
}

.ctv-com-wrapper:focus-within .ctv-com-popup-btn {
  border-color: var(--el-color-primary, #409eff);
}

/* ── 커스텀 드롭다운: wrapper 전체 너비, 왼쪽 기준 고정 ── */
.ctv-com-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  z-index: 2000;
  background: #fff;
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: var(--el-border-radius-base, 4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-height: 280px;
  overflow-y: auto;
}

.ctv-com-dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.ctv-com-dropdown-item:hover {
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.ac-code-cell {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--el-color-primary, #409eff);
  padding-right: 12px;
}

.ac-name-cell {
  flex: 1;
  color: var(--el-text-color-primary, #303133);
  padding-right: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-ref-cell {
  flex: 1;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 모달 내 검색 영역 ── */
.com-search-bar { display: flex; gap: 8px; margin-bottom: 14px; }
.com-search-code { flex: 0 0 190px; }
.com-search-name { flex: 1; }

/* ── 결과 영역 ── */
.com-result-wrap { min-height: 380px; }

.com-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  color: #909399;
  gap: 8px;
}

.guide-icon { font-size: 48px; color: #c0c4cc; margin-bottom: 8px; }
.com-guide-sub { font-size: 12px; color: #c0c4cc; }
.com-result-table :deep(.el-table__row) { cursor: pointer; }

.select-check-icon {
  font-size: 18px;
  color: #409eff;
  opacity: 0;
  transition: opacity 0.2s;
}

.com-result-table :deep(.el-table__row:hover) .select-check-icon { opacity: 1; }
</style>
