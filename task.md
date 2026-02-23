# Task: CtvQueryFilter 필드 설정 플랫화

`CtvQueryFilter` 컴포넌트의 `fields` 속성 정의 시, 각 필드의 `props` 안에 작성하던 설정들을 최상위에 직접 작성할 수 있도록 개선합니다. 이를 통해 설정 코드의 가독성을 높이고 작성을 편리하게 합니다.

## 세부 작업
- [ ] `CtvQueryFilter.vue` 수정
    - [ ] `normalizedFields` 계산 로직을 수정하여 최상위 속성들을 `props`로 자동 병합 (하위 호환성 유지)
    - [ ] 슬롯(`slots`) 정의 내의 컴포넌트 설정도 플랫화 지원
    - [ ] 중복 정의된 `labelPosition` prop 제거
    - [ ] `initializeFieldValues` 및 `handleReset` 로직 보정
- [ ] `Tab002n.js` 수정
    - [ ] 기존 중첩된 `props` 구조를 플랫한 구조로 변경하여 동작 확인
- [ ] 빌드 및 전체 동작 검증
