/**
 * useFileUpload.js
 *
 * 범용 파일 업로드 composable — FileUploadApi.ashx 연동
 *
 * 레거시 FileUpload.js 의 fnInit() 폴더 구성 로직을 Vue 에서 재현합니다.
 *
 * ■ upload(file, config, focusData?)
 *   - FileUploadApi.ashx 에 multipart/form-data 로 파일을 POST 합니다.
 *   - config.folder4Field / folder5Field 가 있으면 focusData 에서 값을 꺼냅니다.
 *   - 성공 시 { NM_FILE, FOLDER4 } 반환
 *
 * ■ saveToDb(filename, config, focusData?)
 *   - 기존 FileUpLoad.ashx → 해당 Action 으로 DB 저장을 요청합니다.
 *
 * ■ deleteFile(filename, config, focusData?)
 *   - 삭제 Action 으로 DB + 파일 삭제를 요청합니다.
 *
 * config 예시 (Free001n.js 인감도장 — Singo 유형):
 * {
 *   folder2    : 'EtcFile',
 *   folder3    : 'Singo',
 *   folder4Field: 'PK_DEC_POB',   // focusData 에서 동적으로 취득
 *   accept     : '.png,.jpg',
 *   maxSizeMb  : 5,
 *   ashxUrl    : 'FileUpLoad.ashx',   // 파일업로드 API URL (기본값)
 *   dbSaveAction: 'ShingoImageSave',
 *   dbDeleteAction: 'ShingoImageDelete',
 * }
 */
import { ref } from 'vue';

/** FileUploadApi.ashx 기본 경로 — 기존 FileUpLoad.ashx 와 동일 경로 */
const DEFAULT_UPLOAD_API = '../../cwwsCom/NewFileUpload/FileUploadApi.ashx';

export function useFileUpload() {
  const uploading = ref(false);
  const progress  = ref(0);

  // 전역 변수 접근 헬퍼
  // 페이지가 iframe 안에서 실행되므로, gJCerts/gSInfo/ufnXhrDotNetCaller04 등은
  // window.top 이 아닌 현재 window 에 직접 정의되어 있음.
  function _g(name) {
    if (window[name] !== undefined) return window[name];
    if (window.parent && window.parent[name] !== undefined) return window.parent[name];
    if (window.top && window.top[name] !== undefined) return window.top[name];
    return undefined;
  }
  // ctv-ComVar.js 에 정의된 전역 상수(인덱스) 하드코딩
  // (iframe 환경 스코프 문제로 변수 접근 불가 시 폴백 용도)
  const CONST_KEYS = {
    'PYPATH': 0,
    'LICKEY': 1,
    'LIBKEY': 1, // gCerts 인덱스지만 legacy 코드에서 gSInfo[LIBKEY]로 사용됨
    'COMPNY': 2,
    'LOGNAU': 5,
  };

  // 객체 프로퍼티 접근 (gSInfo[COMPNY] 등)
  function _gs(obj, key) {
    if (!obj) return undefined;
    const k = _g(key);
    if (k !== undefined && obj[k] !== undefined) return obj[k];
    if (CONST_KEYS[key] !== undefined && obj[CONST_KEYS[key]] !== undefined) return obj[CONST_KEYS[key]];
    return obj[key];
  }

  // ─────────────────────────────────────────────────────────────────
  // 내부 유틸: FormData 생성
  // ─────────────────────────────────────────────────────────────────
  function _buildFormData(file, config, focusData) {
    const gSInfo = _g('gSInfo');

    const adminInfo = config.adminInfo || _gs(gSInfo, 'LOGNAU') || '';

    const fd = new FormData();
    fd.append('file',      file);
    fd.append('adminInfo', adminInfo);

    // ── 단일 문자열 방식 (config.folder) ──
    // config.folder 안에 이미 회사코드가 포함되어 있으므로 folder1 전송 불필요
    if (config.folder) {
      fd.append('folder', config.folder);
      // folder1: 보안 세션 검증을 위해 ASHX에 전송 (폴더 추출해서 사용)
      const company = config.folder1 !== undefined
        ? config.folder1
        : (_gs(gSInfo, 'COMPNY') || '');
      fd.append('folder1', company);
    } else {
      // ── 기존 folder2~5 방식 (하위 호환) ──
      const folder1 = config.folder1 !== undefined
        ? config.folder1
        : (_gs(gSInfo, 'COMPNY') || '');
      let folder4 = config.folder4 !== undefined ? config.folder4 : '';
      if (!folder4 && config.folder4Field && focusData) {
        folder4 = (focusData[config.folder4Field] ?? '').toString().trim();
      }
      let folder5 = config.folder5 || '';
      if (!folder5 && config.folder5Field && focusData) {
        folder5 = (focusData[config.folder5Field] ?? '').toString().trim();
      }
      fd.append('folder1', folder1);
      fd.append('folder2', config.folder2 || '');
      fd.append('folder3', config.folder3 || '');
      fd.append('folder4', folder4);
      fd.append('folder5', folder5);
    }

    // 세션 인증 정보 첨부 (window.top → window 순서로 탐색)
    // 기존 ufnXhrDotNetCaller04의 레거시 방식과 동일하게 맞춤
    const gCerts = _g('gCerts'); // top.gCerts
    if (gCerts) {
      fd.append('jCerts', JSON.stringify(gCerts));
    }

    const gSInfoObj = _g('gSInfo'); // top.gSInfo
    if (gSInfoObj) {
      // KeyInfo는 배열 형태로 [top.gSInfo[LIBKEY]] 가 들어감
      const libKeyValue = _gs(gSInfoObj, 'LIBKEY') || _gs(gSInfoObj, 'LICKEY') || '';
      fd.append('KeyInfo', JSON.stringify([libKeyValue]));
    }

    return fd;
  }

  // ─────────────────────────────────────────────────────────────────
  // 파일 크기/타입 사전 검증
  // accept 가 없으면 파일 타입 검증 생략 (ASHX에서 확장자 코어 검증)
  // maxSizeMb 가 없으면 크기 검증 생략
  // ─────────────────────────────────────────────────────────────────
  function _validate(file, config) {
    if (config.maxSizeMb) {
      const maxBytes = config.maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        return `파일 크기는 ${config.maxSizeMb}MB 이하여야 합니다.`;
      }
    }
    if (config.accept) {
      const allowed = config.accept.split(',').map(s => s.trim().replace('.', '').toLowerCase());
      const ext     = file.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        return `허용되지 않는 파일 형식입니다. (${ext})`;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // upload
  // ashxUrl 기본값: '../../cwwsCom/NewFileUpload/FileUploadApi.ashx'
  // ─────────────────────────────────────────────────────────────────
  async function upload(file, config, focusData = null) {
    const validErr = _validate(file, config);
    if (validErr) throw new Error(validErr);

    // ashxUrl 기본값 내장
    const apiUrl = config.ashxUrl || DEFAULT_UPLOAD_API;
    const fd     = _buildFormData(file, config, focusData);

    uploading.value = true;
    progress.value  = 0;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          progress.value = Math.round((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        uploading.value = false;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.ErrorCode && res.ErrorCode !== '') {
            reject(new Error(res.ErrorMessage || '업로드 오류'));
          } else {
            progress.value = 100;
            resolve({ NM_FILE: res.NM_FILE, FOLDER4: res.FOLDER4 });
          }
        } catch (e) {
          reject(new Error('응답 파싱 실패: ' + xhr.responseText));
        }
      };

      xhr.onerror = () => {
        uploading.value = false;
        reject(new Error('네트워크 오류'));
      };

      xhr.send(fd);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // saveToDb — 기존 FileUpLoad.ashx Action 호출 (DB 저장)
  // ─────────────────────────────────────────────────────────────────
  async function saveToDb(filename, config, focusData = null) {
    const gSInfo = _g('gSInfo');
    const ashxUrl = config.dbSaveAshxUrl || 'FileUpLoad.ashx';
    const action  = config.dbSaveAction;
    if (!action) throw new Error('dbSaveAction 이 지정되지 않았습니다.');

    const idValue = focusData?.[config.idField] || '';

    const bParam = [
      _gs(gSInfo, 'ERPSDB') || '',  // 0
      _gs(gSInfo, 'PYPATH') || '',  // 1
      _gs(gSInfo, 'COMPNY') || '',  // 2
      config.folder2 || '',          // 3
      config.folder3 || '',          // 4
      idValue,                       // 5
      idValue,                       // 6
      filename,                      // 7
    ];

    const caller = _g('ufnXhrDotNetCaller04');
    if (typeof caller !== 'function') {
      throw new Error('ufnXhrDotNetCaller04 를 찾을 수 없습니다.');
    }

    const rjSon = await caller(true, ashxUrl, [action, ''], bParam, '""');
    if (rjSon?.ErrorCode && rjSon.ErrorCode !== '') {
      throw new Error(rjSon.ErrorMessage || 'DB 저장 오류');
    }
    return rjSon;
  }

  // ─────────────────────────────────────────────────────────────────
  // deleteFile — 기존 FileUpLoad.ashx Action 호출 (삭제)
  // ─────────────────────────────────────────────────────────────────
  async function deleteFile(filename, config, focusData = null) {
    const gSInfo  = _g('gSInfo');
    const ashxUrl = config.deleteAshxUrl || 'FileUpLoad.ashx';
    const action  = config.deleteAction;
    if (!action) throw new Error('deleteAction 이 지정되지 않았습니다.');

    const idValue = focusData?.[config.idField] || '';

    const bParam = [
      _gs(gSInfo, 'ERPSDB') || '',
      _gs(gSInfo, 'PYPATH') || '',
      _gs(gSInfo, 'COMPNY') || '',
      config.folder2 || '',
      config.folder3 || '',
      idValue,
      idValue,
      filename,
    ];

    const caller = _g('ufnXhrDotNetCaller04');
    if (typeof caller !== 'function') {
      throw new Error('ufnXhrDotNetCaller04 를 찾을 수 없습니다.');
    }

    const rjSon = await caller(true, ashxUrl, [action, ''], bParam, '""');
    if (rjSon?.ErrorCode && rjSon.ErrorCode !== '') {
      throw new Error(rjSon.ErrorMessage || '파일 삭제 오류');
    }
    return rjSon;
  }

  // ─────────────────────────────────────────────────────────────────
  // 이미지 URL 조합 헬퍼
  // baseUrl 기본값: '../../cwwsFiles/'
  //
  // config.folder 사용 시:
  //   {baseUrl}/{company}/{folder}/{filename}
  //   예) '../../cwwsFiles/CTviv-WRK/EtcFile/Singo/01/파일.png'
  //
  // config.folder2/3/4 사용 시 (하위 호환):
  //   {baseUrl}/{company}/{f2}/{f3}/{f4}/{filename}
  // ─────────────────────────────────────────────────────────────────
  function buildImageUrl(filename, config, focusData = null, baseUrl = '../../cwwsFiles/') {
    if (!filename) return '';

    const gSInfo  = _g('gSInfo');
    const company = config.folder1 !== undefined
      ? config.folder1
      : (_gs(gSInfo, 'COMPNY') || '');
    const base    = baseUrl.replace(/\/$/, '');

    // ── config.folder 단일 문자열 방식 ──
    if (config.folder) {
      const folderStr = config.folder.replace(/\\/g, '/');
      const parts = [base];
      // 폴더 경로 맨 앞에 이미 회사코드가 포함되어 있다면 중복 삽입 방지
      if (company && !folderStr.startsWith(`${company}/`) && folderStr !== company) {
        parts.push(company);
      }
      parts.push(config.folder);
      parts.push(filename);
      return parts.filter(Boolean).join('/');
    }

    // ── 기존 folder2~5 방식 (하위 호환) ──
    const f2 = config.folder2 || '';
    const f3 = config.folder3 || '';
    let   f4 = config.folder4 !== undefined ? config.folder4 : '';
    if (!f4 && config.folder4Field && focusData) {
      f4 = (focusData[config.folder4Field] ?? '').toString().trim();
    }
    let f5 = config.folder5 || '';
    if (!f5 && config.folder5Field && focusData) {
      f5 = (focusData[config.folder5Field] ?? '').toString().trim();
    }

    const parts = [base, company, f2, f3, f4];
    if (f5 && f5 !== 'ALL') parts.push(f5);
    parts.push(filename);

    // filter(Boolean): 빈 문자열 제거 → 경로 '//' 방지
    return parts.filter(Boolean).join('/');
  }

  return {
    uploading,
    progress,
    upload,
    saveToDb,
    deleteFile,
    buildImageUrl,
  };
}
