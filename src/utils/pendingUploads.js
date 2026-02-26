/**
 * pendingUploads
 *
 * deferUpload 모드에서 파일 선택 시 File 객체와 업로드 설정을 임시 보관하는 전역 레지스트리.
 *
 * 동작 흐름:
 *   1. CtvImage (deferUpload: true): 파일 선택
 *      → innerValue = 파일명 ("이미지.png")
 *      → pendingUploads.set("IMG_FILE_NM", File객체, uploadConfig, focusData)
 *
 *   2. CtvDataGrid.save():
 *      → 저장 직전 FileUploadApi.ashx 로 실제 파일을 업로드 (Binary 방식)
 *      → 서버가 반환한 실제 파일명을 aSaveData 에 주입
 *      → DB 저장 (ufnXhrDotNetCaller)
 *      → [안전장치] DB 저장이 실패하면 방금 업로드한 파일을 다시 삭제
 *
 * 키: field 명 (예: 'IMG_FILE_NM')
 * 값: { file: File, uploadConfig: object, focusData: object }
 */

const _store = new Map();

export const pendingUploads = {
  /**
   * 대기 중인 파일을 등록합니다.
   * @param {string}  field        - 모델 필드명 (예: 'IMG_FILE_NM')
   * @param {File}    file         - 실제 File 객체
   * @param {object}  uploadConfig - CtvImage 의 uploadConfig prop
   * @param {object}  focusData    - CtvImage 의 focusData prop (동적 폴더 값 추출용)
   */
  set(field, file, uploadConfig, focusData) {
    _store.set(field, { file, uploadConfig, focusData });
  },

  /**
   * 대기 중인 파일 정보를 반환합니다.
   * @param {string} field
   * @returns {{ file: File, uploadConfig: object, focusData: object } | undefined}
   */
  get(field) {
    return _store.get(field);
  },

  /**
   * 특정 필드의 대기 항목을 제거합니다.
   * @param {string} field
   */
  delete(field) {
    _store.delete(field);
  },

  /**
   * 현재 레지스트리의 복사본을 반환하고 레지스트리를 초기화합니다.
   * CtvDataGrid.save() 에서 업로드 시작 시 호출합니다.
   * @returns {Map<string, { file: File, uploadConfig: object, focusData: object }>}
   */
  flushAll() {
    const snapshot = new Map(_store);
    _store.clear();
    return snapshot;
  },

  /** 레지스트리가 비어 있는지 확인합니다. */
  isEmpty() {
    return _store.size === 0;
  },
};
