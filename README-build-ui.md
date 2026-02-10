# ctv-ui 빌드 (build:ui)

ctv-ui 스크립트와 **es-hangul** 라이브러리를 하나로 묶어 `js/ctv-ui.js`, `js/ctv-ui.min.js`를 만듭니다.

## 사용 방법

```bash
cd Program/cwwsCom
npm install
npm run build:ui
```

- `npm install`: es-hangul, esbuild 설치
- `npm run build:ui`: es-hangul을 번들에 포함한 뒤 ctv-ui 스크립트를 합쳐 `js/ctv-ui.js`와 `js/ctv-ui.min.js` 생성

## 동작

1. **es-hangul-shim.js**를 진입점으로 esbuild가 es-hangul을 번들링해 `window.__ES_HANGUL__`에 넣는 IIFE를 만든다.
2. 위 IIFE + ctv-ui 스크립트들(Component, DataGrid, FreeForm 등)을 이어 붙여 **js/ctv-ui.js**를 만든다.
3. **js/ctv-ui.js**를 minify 해서 **js/ctv-ui.min.js**를 만든다.

ctv-Component.js의 한글 콤보 검색/정렬은 `__ES_HANGUL__`이 있으면 es-hangul의 `getChoseong`, `disassemble`을 쓰고, 없으면 내장 로직을 씁니다.
