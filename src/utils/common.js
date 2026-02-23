import { ref } from 'vue';

export const activeGridId = ref('');

/**
 * 전역 콤보 데이터 로드 함수
 * 페이지에서 사용할 모든 콤보 데이터를 한 번에 로드하여 gGridComboData 생성
 * @param {Array} cParam - 콤보 CODE 배열
 * @returns {Promise<Array|null>} 콤보 데이터 배열 또는 null
 */
export async function loadComboData(cParam) {
    if (!cParam || cParam.length === 0) {
        return null;
    }

    // 전역 객체 접근 (top, ufnXhrDotNetCombo2 등은 외부 스크립트에서 정의됨)
    /* eslint-disable no-undef */
    const bParam = [top.gSInfo[DIVCOD], top.gSInfo[ERPSDB]];
    const dParam = "";

    let comboData = null;

    try {
        const rjSon = await ufnXhrDotNetCombo2(
            true,
            "../CwwsCombo.ashx",
            ["CreateCombo", ""],
            bParam,
            cParam,
            dParam
        );

        if (rjSon.ErrorCode !== "") {
            top.mwPop09Open(rjSon, rjSon.ErrorCode);
            return null;
        }

        if (rjSon.gComboInfoc && rjSon.gComboInfoc.length > 0) {
            const comboArray = rjSon.gComboInfoc.split("■");

            // 하위 호환성: 전역변수 설정 (기존 코드 지원)
            window._filterCombo = comboArray;

            // 레거시 방식: gGridComboData 생성
            if (typeof fnCreateGridCombo === "function") {
                comboData = fnCreateGridCombo(comboArray);
            }

            // ✅ 콤보 데이터 반환
            return comboData;
        }

        return null;
    } catch (error) {
        console.error("전역 콤보 데이터 로드 실패:", error);
        if (top.mwPop09Open) {
            top.mwPop09Open(
                {
                    ErrorMsg:
                        "콤보 데이터 로드 중 오류가 발생했습니다: " +
                        error.message,
                },
                "ERROR"
            );
        }
        return null;
    }
}

export async function setCombo(targetOptions, codeMap) {
    if (!codeMap || Object.keys(codeMap).length === 0) {
        return;
    }

    const keys = Object.keys(codeMap);

    const cParam = keys.map(key => {
        const val = codeMap[key];

        // 문자열로만 넘긴 경우 (예: "B031") -> 기본값 FLAG: "0" 적용
        if (typeof val === 'string') {
            return { "CODE": val, "FLAG": "0" };
        }
        // 객체로 넘긴 경우 (예: { CODE: "B019", FLAG: "0-Y", CD_DTL: "..." })
        else {
            return { ...val, "FLAG": val.FLAG || "0" };
        }
    });

    const resultList = await loadComboData(cParam);

    if (resultList && Array.isArray(resultList)) {
        keys.forEach((key, index) => {
            const data = resultList[index] || [];
            // 로딩 완료 플래그 추가 (CtvDataGrid 자동 렌더링 제어용)
            Object.defineProperty(data, '__loaded', { value: true, enumerable: false, writable: true });
            targetOptions[key] = data;
        });
    } else {
        console.warn("[ComboMap] 데이터를 로드하지 못했습니다.");
    }
}

/**
 * 데이터 조회 공통 함수
 * @param {Object} config - { path, funcNm, bParam }
 * @returns {Promise<Object|null>} 조회 결과 객체 (rsDataXX 포함) 또는 null
 */
export async function dataQuery(config) {
    const { path, funcNm = "UfnQuery", bParam = [] } = config;

    if (!path) {
        console.error("[CtvCommon] dataQuery: path가 없습니다.");
        return null;
    }

    // 로딩바 표시
    if (typeof top.mwHourglassShow === 'function') {
        top.mwHourglassShow();
    }

    try {
        /* eslint-disable no-undef */
        const result = await ufnXhrDotNetCaller04(
            true,
            path,
            [funcNm, ""],
            bParam
        );

        if (result.ErrorCode && result.ErrorCode !== "") {
            if (typeof top.mwHourglassHide === 'function') {
                top.mwHourglassHide();
            }
            if (typeof top.mwPop09Open === 'function') {
                top.mwPop09Open(result, result.ErrorCode);
            }
            return null;
        }

        // 결과 데이터 중 rsDataXX 형식의 JSON 문자열은 객체로 자동 파싱
        Object.keys(result).forEach(key => {
            if (key.startsWith('rsData') && typeof result[key] === 'string') {
                try {
                    result[key] = JSON.parse(result[key]);
                } catch (e) {
                    // JSON 파싱 실패 시 원본 문자열 유지
                }
            }
        });

        if (typeof top.mwHourglassHide === 'function') {
            top.mwHourglassHide();
        }

        return result;

    } catch (error) {
        console.error("[CtvCommon] dataQuery 오류:", error);
        if (typeof top.mwHourglassHide === 'function') {
            top.mwHourglassHide();
        }
        if (typeof top.mwPop09Open === 'function') {
            top.mwPop09Open(
                { ErrorMsg: "조회 중 오류가 발생했습니다: " + error.message },
                "ERROR"
            );
        }
        return null;
    }
}