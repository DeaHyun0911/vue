# CtvDataGrid & CtvQueryFilter 자동화 기능 개선

## 개요
`CtvDataGrid`와 `CtvQueryFilter` 컴포넌트에 자동 조회/초기화 기능을 추가하여, 각 페이지에서 반복적인 query/reset 함수를 작성할 필요가 없도록 개선했습니다.

## 주요 변경사항

### 1. CtvDataGrid 개선

#### queryConfig prop 추가
그리드에서 조회할 데이터를 선언적으로 정의할 수 있는 `queryConfig` prop을 추가했습니다.

```vue
<ctv-data-grid 
  id="grid1" 
  :build-grid-config="gridConfig" 
  :query-config="queryConfig"
  :editable="true">
</ctv-data-grid>
```

#### queryConfig 구조
```javascript
const queryConfig = {
  path: "Handler.ashx",        // 핸들러 경로
  funcNm: "UfnQuery",          // 함수명
  params: () => [               // 파라미터 (함수 또는 배열/객체)
    top.gSInfo[ERPSDB],
    search.field1,
    search.field2,
  ],
  dataPath: 'rsData01'         // 응답에서 데이터를 추출할 경로 (기본값: 'rsData01')
};
```

#### 자동 query/reset 메서드
- `query()`: queryConfig를 기반으로 자동으로 데이터를 조회하고 그리드에 설정
- `reset()`: 그리드 데이터를 빈 배열로 초기화
- 두 메서드는 컴포넌트 레지스트리에 자동 등록되어 CtvQueryFilter에서 호출 가능

#### autoLoad prop
```vue
<ctv-data-grid 
  :query-config="queryConfig"
  :auto-load="true">  <!-- 마운트 시 자동 조회 -->
</ctv-data-grid>
```

### 2. CtvQueryFilter 개선

#### 자동 필드 초기화
`초기화` 버튼 클릭 시 모든 필드를 자동으로 초기값으로 리셋합니다.

**초기값 결정 로직:**
1. `field.props.defaultValue`가 있으면 해당 값 사용
2. `ctv-check`, `ctv-switch`는 `false`
3. `multiple` 속성이 있는 필드는 빈 배열 `[]`
4. 그 외에는 빈 문자열 `''`

**사용 예시:**
```javascript
const filterFields = computed(() => [
  {
    component: 'ctv-select',
    field: 'status',
    props: {
      title: '상태',
      defaultValue: 'ALL'  // 초기화 시 'ALL'로 리셋
    }
  }
]);
```

### 3. Grid001n.js 간소화

#### 변경 전 (기존 코드)
```javascript
const fnQuery = async () => {
  const data = await Ctv.dataQuery({
    path: "Bpa100n.ashx",
    funcNm: "UfnQuery",
    bParam: [
      top.gSInfo[ERPSDB],
      search.ID_PGM,
      search.NM_KOR_PGM,
      search.MC_MENU,
      search.MC_PGM_TYPE,
    ],
  });

  if (data && data.rsData01) {
    grid.value.setData(data.rsData01);
  }
};

const fnReset = () => {
  search.ID_PGM = '';
  search.NM_KOR_PGM = '';
  search.MC_MENU = '';
  search.MC_PGM_TYPE = '';
};

onMounted(async () => {
  await Ctv.setCombo(options, { ... });
  
  // 레지스트리에 수동 등록
  await Vue.nextTick();
  const gridComponent = componentRegistry.get('grid1');
  if (gridComponent) {
    gridComponent.query = fnQuery;
    gridComponent.reset = fnReset;
  }
  
  comboLoaded.value = true;
});

return {
  grid,
  fnQuery,
  fnReset,
  ...
};
```

#### 변경 후 (간소화된 코드)
```javascript
// 조회 설정만 정의
const queryConfig = {
  path: "Bpa100n.ashx",
  funcNm: "UfnQuery",
  params: () => [
    top.gSInfo[ERPSDB],
    search.ID_PGM,
    search.NM_KOR_PGM,
    search.MC_MENU,
    search.MC_PGM_TYPE,
  ],
  dataPath: 'rsData01'
};

onMounted(async () => {
  await Ctv.setCombo(options, { ... });
  comboLoaded.value = true;
  // 레지스트리 등록은 CtvDataGrid가 자동 처리
});

return {
  queryConfig,  // queryConfig만 반환
  ...
};
```

**제거된 코드:**
- ❌ `fnQuery` 함수 작성 불필요
- ❌ `fnReset` 함수 작성 불필요
- ❌ `componentRegistry.get()` 수동 호출 불필요
- ❌ 레지스트리에 메서드 수동 등록 불필요
- ❌ `grid` ref 선언 불필요 (queryConfig 사용 시)

**약 40줄의 보일러플레이트 코드 제거!**

## 사용 가이드

### 기본 사용법

**1. 페이지 JS 파일**
```javascript
window.onPageSetup = function () {
  const search = reactive({
    field1: '',
    field2: ''
  });

  // 조회 설정
  const queryConfig = {
    path: "YourHandler.ashx",
    funcNm: "UfnQuery",
    params: () => [
      top.gSInfo[ERPSDB],
      search.field1,
      search.field2
    ]
  };

  const gridConfig = (state) => ({
    columns: [...]
  });

  return {
    search,
    queryConfig,
    gridConfig,
    onFilterUpdate: (field, value) => { search[field] = value; }
  };
};
```

**2. ASPX 파일**
```html
<ctv-query-filter 
  :fields="filterFields" 
  target="grid1">
</ctv-query-filter>

<ctv-data-grid 
  id="grid1"
  :build-grid-config="gridConfig"
  :query-config="queryConfig">
</ctv-data-grid>
```

### 고급 사용법

#### params를 객체로 전달
```javascript
const queryConfig = {
  path: "Handler.ashx",
  funcNm: "UfnQuery",
  params: () => ({
    db: top.gSInfo[ERPSDB],
    ...search  // spread로 모든 검색 조건 전달
  })
};
```

#### 다른 응답 경로 사용
```javascript
const queryConfig = {
  path: "Handler.ashx",
  funcNm: "UfnQuery",
  params: () => [...],
  dataPath: 'result.data'  // data.result.data에서 그리드 데이터 추출
};
```

#### 필드 기본값 설정
```javascript
const filterFields = computed(() => [
  {
    component: 'ctv-select',
    field: 'type',
    props: {
      title: '타입',
      defaultValue: 'ALL',  // 초기화 시 'ALL'로
      options: [...]
    }
  },
  {
    component: 'ctv-check',
    field: 'isActive',
    props: {
      title: '활성',
      defaultValue: true  // 초기화 시 true로
    }
  }
]);
```

## 마이그레이션 가이드

기존 페이지를 새로운 방식으로 변경하는 방법:

### Step 1: queryConfig 정의
```javascript
// 기존 fnQuery 함수에서 추출
const queryConfig = {
  path: "기존 path",
  funcNm: "기존 funcNm",
  params: () => [기존 bParam 배열],
  dataPath: '기존 데이터 경로 (보통 rsData01)'
};
```

### Step 2: fnQuery, fnReset 함수 제거
```javascript
// ❌ 삭제
const fnQuery = async () => { ... };
const fnReset = () => { ... };
```

### Step 3: onMounted에서 레지스트리 등록 코드 제거
```javascript
onMounted(async () => {
  await Ctv.setCombo(options, { ... });
  
  // ❌ 이 부분 삭제
  // await Vue.nextTick();
  // const gridComponent = componentRegistry.get('grid1');
  // if (gridComponent) {
  //   gridComponent.query = fnQuery;
  //   gridComponent.reset = fnReset;
  // }
  
  comboLoaded.value = true;
});
```

### Step 4: return에서 불필요한 항목 제거
```javascript
return {
  // ❌ grid ref 제거 (queryConfig 사용 시 불필요)
  // ❌ fnQuery, fnReset 제거
  queryConfig,  // ✅ 추가
  ...
};
```

### Step 5: ASPX 파일에 :query-config 추가
```html
<ctv-data-grid 
  id="grid1"
  :build-grid-config="gridConfig"
  :query-config="queryConfig"   <!-- ✅ 추가 -->
  :editable="true">
</ctv-data-grid>
```

## 이점

1. **코드 간소화**: 페이지당 약 40줄의 보일러플레이트 코드 제거
2. **일관성**: 모든 페이지가 동일한 패턴을 따름
3. **유지보수성**: 조회 로직이 선언적으로 정의되어 이해하기 쉬움
4. **자동화**: 컴포넌트가 레지스트리 등록을 자동 처리
5. **유연성**: params를 함수로 전달하여 동적 파라미터 지원

## 호환성

- ✅ 기존 방식(수동 query/reset)도 여전히 동작
- ✅ queryConfig를 사용하지 않으면 기존과 동일하게 동작
- ✅ 점진적 마이그레이션 가능
