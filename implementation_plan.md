# Implementation Plan - CtvQueryFilter 설정 플랫화

`CtvQueryFilter` 사용 시 필드 설정을 더 직관적으로 할 수 있도록 `props` 객체 중첩을 제거하고 플랫한 구조를 지원하도록 변경합니다.

## 1. CtvQueryFilter.vue (컴포넌트 수정)

### 1-1. 중복 Prop 제거
- `defineProps` 내에 중복으로 정의된 `labelPosition` 속성을 하나로 합칩니다.

### 1-2. 필드 정규화 로직 개선 (`normalizedFields`)
- 필드 정의 객체에서 프레임워크 예약 키(`component`, `field`, `span`, `slots`, `autoLoad`, `parent`, `condition`, `style`, `modelValue`, `props`)를 제외한 나머지 모든 속성을 `props` 내부로 병합합니다.
- 기존의 `field.props`가 있는 경우 이를 우선순위로 두어 병합함으로써 하위 호환성을 유지합니다.
- `slots` 내부의 컴포넌트 설정에 대해서도 동일한 플랫화 로직을 적용합니다.

### 1-3. 초기화 및 리셋 로직 보정
- `initializeFieldValues`에서 `mergedSetting.value.fields` 대신 `normalizedFields.value`를 사용하도록 검토합니다. (정규화된 값을 기준으로 초기값을 세팅하기 위함)
- `handleReset`에서도 `normalizedFields.value`를 사용하도록 수정합니다.

## 2. Tab002n.js (샘플 페이지 수정)

- `filter.fields`의 각 필드 설정을 변경합니다.
  - 예: `props: { title: '...' }` -> `title: '...'`
- `slots` 내부의 설정도 플랫하게 변경합니다.

## 3. 검증 및 빌드

- `npm run build`를 실행하여 빌드 오류가 없는지 확인합니다.
- 실제 화면에서 필드들이 정상적으로 렌더링되고, 초기값 및 조건부 로직이 잘 작동하는지 확인합니다.
