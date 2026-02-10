# CTV UI 테스트 페이지

이 디렉토리는 CTV UI 컴포넌트를 실제 프로젝트 환경과 유사하게 테스트할 수 있는 HTML/JS 파일을 포함합니다.

## 파일 구조

- `test-grid.html` - 그리드 컴포넌트 테스트 페이지
- `test-grid.js` - 테스트 페이지 로직 및 Mock 데이터

## 사용 방법

1. 프로젝트 빌드:
   ```bash
   npm run build
   ```

2. 테스트 페이지 열기:
   - `test-grid.html` 파일을 브라우저에서 직접 열거나
   - 로컬 서버를 통해 실행 (권장)

3. Live Server 사용 (VS Code):
   - `test-grid.html` 파일을 우클릭
   - "Open with Live Server" 선택

## Mock 데이터

테스트 페이지는 서버 없이 동작하도록 다음 Mock 데이터를 제공합니다:

### Ctv.setCombo
- MC_MENU: 메뉴 대분류 (시스템관리, 인사관리, 급여관리, 회계관리)
- MC_AMD_TYPE: 권한 분류 (관리자, 사용자, 조회)
- MC_PGM_TYPE: 프로그램 타입 (입력, 조회, 리포트)
- PGM_FOLDER: 폴더 (/cBase, /cPayTax, /cHR)
- YN_USE: 사용 유무 (사용, 미사용)
- MC_MODL_TYPE: 업무 모듈 구분 (기본모듈, 급여모듈, 인사모듈)

### Ctv.dataQuery
- 5개의 샘플 프로그램 데이터
- 실제 프로젝트와 동일한 데이터 구조

## 주의사항

- SBGrid3 라이브러리가 `../js/SBGrid3/` 경로에 있어야 합니다.
- 빌드된 파일이 `../dist/` 경로에 있어야 합니다.
- 실제 프로젝트와 동일한 환경을 시뮬레이션하므로, 컴포넌트 동작을 정확히 테스트할 수 있습니다.
