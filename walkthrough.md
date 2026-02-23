# Walkthrough - CtvQueryFilter 설정 플랫화

`CtvQueryFilter` 컴포넌트의 설정을 더 간결하고 직관적으로 관리할 수 있도록 개선되었습니다.

## 주요 변경 사항

### 1. CtvQueryFilter.vue 개선
- **필드 설정 플랫화**: 이제 `fields` 배열 내에서 `props: { title: '...' }` 처럼 중첩하여 작성하지 않고, 최상위에 직접 작성할 수 있습니다.
- **하위 호환성 유지**: 기존의 `props` 객체 방식도 여전히 지원하므로 기존 코드를 수정하지 않아도 동작합니다.
- **슬롯 지원**: `slots` 내부의 컴포넌트 설정도 플랫하게 작성할 수 있도록 정규화 로직이 확장되었습니다.
- **코드 정리**: `defineProps` 내에 중복 정의되었던 `labelPosition` 속성을 제거하여 코드를 최적화했습니다.

### 2. 샘플 코드(Tab002n.js) 업데이트
- `Tab002n.js` 파일의 필드 설정 코드를 새로운 플랫한 구조로 변경하였습니다.
- 이전보다 코드가 훨씬 간결해졌으며 각 속성의 의미를 더 쉽게 파악할 수 있습니다.

## 코드 비교 (예시)

### 이전 방식 (Nested)
```javascript
{
    component: 'ctv-select',
    field: 'CD_DEC_POB',
    props: {
        title: '신고사업장',
        options: options.CD_DEC_POB,
    },
    autoLoad: true
}
```

### 개선된 방식 (Flat)
```javascript
{
    component: 'ctv-select',
    field: 'CD_DEC_POB',
    title: '신고사업장',
    options: options.CD_DEC_POB,
    autoLoad: true
}
```

## 검증 결과
- `npm run build`를 통해 빌드가 정상적으로 완료되었으며, `ctv-ui.js` 라이브러리에 성공적으로 반영되었습니다.
