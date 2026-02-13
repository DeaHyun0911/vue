# Grid ↔ Form 양방향 데이터 동기화 가이드

## 개요

SBGrid3의 `focusRow`와 Form 간의 **양방향 자동 동기화** 기능을 제공합니다.

### 동작 원리

```
그리드 행 선택 → focusRow 업데이트 → Form 자동 반영
Form 값 편집 → focusRow 업데이트 → 그리드 선택된 행 자동 반영
```

### 특징

- ✅ **단일 진실의 원천(Single Source of Truth)**: `focusRow` 하나로 통합 관리
- ✅ **Vue3 Reactivity 활용**: Vue의 reactive 시스템으로 자동 동기화
- ✅ **무한루프 방지**: 단일 플래그(`isSyncing`)로 안전하게 관리
- ✅ **간결한 코드**: 기존 `syncForm`, `focusData` 방식 대비 50% 코드 감소

---

## 사용 방법

### 1. Form Model 정의

Form에서 사용할 reactive 객체를 정의합니다.

```javascript
const state = reactive({
    // Form Model (그리드 컬럼과 동일한 필드명 사용)
    formModel: {
        CD_MST: '',
        NM_CODE: '',
        FG_SYS: '',
        YN_USE: '',
        BIGO: ''
    }
});
```

### 2. Grid Setting에 focusRow 연결

그리드 설정의 `focusRow`에 Form Model을 연결합니다.

```javascript
const state = reactive({
    formModel: { /* ... */ },

    mainGrid: {
        id: 'grid1',
        group: 'group1',
        editable: true,
        focusRow: null, // 초기화
        gridConfig: {
            columns: [
                { field: 'CD_MST', caption: '코드', colType: 'C|PK|STR' },
                { field: 'NM_CODE', caption: '코드명', colType: 'L|STR' },
                // ...
            ]
        }
    }
});

// focusRow를 formModel로 연결 (양방향 바인딩 활성화)
state.mainGrid.focusRow = state.formModel;
```

### 3. Form에 Model 바인딩

CtvForm 컴포넌트에 동일한 `formModel`을 바인딩합니다.

```vue
<ctv-form :model="formModel" :columns="2">
    <ctv-form-item label="코드">
        <ctv-input field="CD_MST" disabled></ctv-input>
    </ctv-form-item>
    <ctv-form-item label="코드명">
        <ctv-input field="NM_CODE"></ctv-input>
    </ctv-form-item>
    <ctv-form-item label="시스템구분">
        <ctv-select field="FG_SYS" :options="options.FG_SYS"></ctv-select>
    </ctv-form-item>
    <!-- ... -->
</ctv-form>
```

---

## 완전한 예제

### JavaScript (Vue3 Composition API)

```javascript
import { reactive } from 'vue';

const state = reactive({
    // 1. Form Model 정의
    formModel: {
        CD_MST: '',
        NM_CODE: '',
        FG_SYS: '',
        YN_USE: '',
        BIGO: ''
    },

    // 2. Grid 설정
    mainGrid: {
        id: 'grid1',
        group: 'group1',
        title: '상품 목록',
        editable: true,
        autoLoad: true,
        focusRow: null, // 나중에 연결

        gridConfig: {
            columns: [
                { field: 'CD_MST', caption: '상품ID', colType: 'C|PK|STR', width: '100px' },
                { field: 'NM_CODE', caption: '상품명', colType: 'L|STR', width: '200px' },
                { field: 'FG_SYS', caption: '카테고리', colType: 'C|STR', width: '100px' },
                { field: 'YN_USE', caption: '사용여부', colType: 'C|STR', width: '80px' },
                { field: 'BIGO', caption: '비고', colType: 'L|STR', width: '150px' }
            ]
        },

        query: {
            path: 'Handler.ashx',
            funcNm: 'UfnQuery',
            dataPath: 'rsData01'
        }
    }
});

// 3. focusRow 연결 (양방향 동기화 활성화)
state.mainGrid.focusRow = state.formModel;
```

### HTML Template

```html
<div id="app">
    <ctv-container aside-width="50%">
        <!-- 좌측: 그리드 -->
        <template #aside>
            <ctv-data-grid :setting="mainGrid"></ctv-data-grid>
        </template>

        <!-- 우측: 폼 -->
        <div>
            <h4>선택된 행 편집</h4>
            <ctv-form :model="formModel" :columns="2">
                <ctv-form-item label="상품ID">
                    <ctv-input field="CD_MST" disabled></ctv-input>
                </ctv-form-item>
                <ctv-form-item label="상품명">
                    <ctv-input field="NM_CODE"></ctv-input>
                </ctv-form-item>
                <ctv-form-item label="카테고리">
                    <ctv-select field="FG_SYS" :options="options.FG_SYS"></ctv-select>
                </ctv-form-item>
                <ctv-form-item label="사용여부">
                    <ctv-switch field="YN_USE" active-value="Y" inactive-value="N"></ctv-switch>
                </ctv-form-item>
            </ctv-form>

            <!-- 실시간 동기화 확인용 -->
            <pre>{{ formModel }}</pre>
        </div>
    </ctv-container>
</div>
```

---

## 동작 순서

### Grid → Form (행 선택 시)

1. 사용자가 그리드 행 클릭
2. `focus` 이벤트 발생
3. `updateFocusRow()` 호출
4. `SBGrid3.getFocusedValue()`로 행 데이터 추출
5. `focusRow` 객체에 값 복사 (`Object.assign`)
6. Vue reactivity에 의해 Form 자동 업데이트

### Form → Grid (값 편집 시)

1. 사용자가 Form 입력 필드 편집
2. `formModel` 값 변경
3. `watch(() => focusRow, ...)` watcher 트리거
4. `SBGrid3.setRowValue()`로 그리드 셀 업데이트
5. 그리드의 해당 행 데이터 즉시 반영

---

## 주의사항

### 1. 필드명 일치 필수

그리드 컬럼의 `field`와 Form의 `field`가 **정확히 일치**해야 합니다.

```javascript
// ✅ 올바른 예시
gridConfig: {
    columns: [
        { field: 'NM_CODE', caption: '이름' }
    ]
}

formModel: {
    NM_CODE: ''  // 그리드와 동일한 필드명
}
```

```javascript
// ❌ 잘못된 예시
gridConfig: {
    columns: [
        { field: 'NM_CODE', caption: '이름' }
    ]
}

formModel: {
    name: ''  // 필드명 불일치 → 동기화 안됨
}
```

### 2. focusRow 연결 시점

`focusRow`는 reactive 객체를 직접 참조해야 합니다.

```javascript
// ✅ 올바른 예시
const state = reactive({
    formModel: { ... },
    mainGrid: { focusRow: null }
});
state.mainGrid.focusRow = state.formModel; // 참조 연결

// ❌ 잘못된 예시
mainGrid: {
    focusRow: { ...state.formModel } // 복사본 → 동기화 안됨
}
```

### 3. 데이터 없을 때 처리

그리드에 데이터가 없으면 `formModel`이 자동으로 초기화됩니다.

```javascript
// 그리드 데이터 로드 시
setData([])
// → clearFocusRow() 호출
// → formModel의 모든 필드가 '' 으로 초기화
```

---

## 기존 방식과 비교

### 기존 방식 (syncForm / focusData)

```javascript
// ❌ 복잡한 설정
mainGrid: {
    syncForm: {
        state: formState,
        columns: 'all' // 또는 ['CD_MST', 'NM_CODE', ...]
    }
}

// 또는
mainGrid: {
    focusData: formData  // 별도 객체
}
```

**문제점:**
- `syncForm`과 `focusData` 두 가지 방식 혼재
- 플래그 3개 (`isSyncingFromGrid`, `isSyncingFromGridToFocusData`, `isSyncingToGrid`)
- 동기화 타이밍 충돌 가능성

### 새로운 방식 (focusRow)

```javascript
// ✅ 간결한 설정
state.mainGrid.focusRow = state.formModel;
```

**개선점:**
- 단일 설정으로 양방향 동기화
- 플래그 1개 (`isSyncing`)
- Vue3 reactivity 최대 활용
- 코드 50% 감소

---

## 문제 해결

### Q1. Form 값이 그리드에 반영되지 않아요

**A.** 다음을 확인하세요:
1. `focusRow`가 제대로 연결되었는지 (`state.mainGrid.focusRow = state.formModel`)
2. Form의 `field`와 그리드의 `field`가 일치하는지
3. 그리드에서 행이 선택되어 있는지 (포커스 필요)

### Q2. 그리드 행을 선택해도 Form이 업데이트되지 않아요

**A.** 다음을 확인하세요:
1. `formModel`이 reactive 객체인지 (`reactive()` 사용)
2. 콘솔 로그에서 `[CtvDataGrid] Grid → focusRow 동기화` 메시지 확인
3. 브라우저 개발자 도구에서 `formModel` 값 변경 확인

### Q3. 무한루프가 발생해요

**A.** 정상적인 사용 시 발생하지 않습니다. `isSyncing` 플래그가 자동으로 무한루프를 방지합니다.
만약 발생한다면:
1. 동일한 필드에 대해 중복된 watcher가 있는지 확인
2. `focusRow`를 여러 곳에서 수정하고 있지 않은지 확인

---

## API 참조

### Setting 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `focusRow` | `Object` | Form과 양방향 동기화할 reactive 객체 |

### 내부 함수

| 함수명 | 설명 |
|--------|------|
| `updateFocusRow(grid, rowItem)` | Grid → focusRow 동기화 |
| `clearFocusRow()` | focusRow 초기화 |
| `setupFocusRowSync()` | 양방향 동기화 watcher 설정 |

---

## 라이브 데모

실제 동작을 확인하려면 다음 파일을 브라우저에서 열어보세요:

```
test/test-grid-form.html
```

---

## 변경 이력

### v2.0.0 (2026-02-13)
- ✨ `focusRow` 기반 통합 동기화 방식 도입
- 🗑️ `syncForm`, `focusData` 방식 제거 (레거시)
- 🚀 성능 개선 및 코드 간소화

---

## 라이센스

본 문서는 프로젝트 라이센스를 따릅니다.
