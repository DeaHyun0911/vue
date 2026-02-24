import { ref } from 'vue';

export const activeGridId = ref('');

/**
 * 콤보 문자열 배열을 파싱하여 콤보 데이터 배열로 변환
 * 레거시 fnCreateGridCombo의 로직을 그대로 추출하되, gGridComboData에 할당하지 않고 순수하게 반환만 함
 * @param {string[]} rvComboList - "value;label[;pcode]|#value;label..." 형식의 문자열 배열
 * @returns {Array[]} 파싱된 콤보 데이터 배열 (각 항목은 { value, label, pcode? } 객체의 배열)
 */
export function parseComboList(rvComboList) {
    const aGridComboData = [];
    const len = rvComboList.length;

    for (let iLoop = 0; iLoop < len; iLoop++) {
        const aComboA = rvComboList[iLoop].split("|#");
        const aGridComboA = [];

        for (let kLoop = 0; kLoop < aComboA.length; kLoop++) {
            if (aComboA[kLoop] !== "") {
                const aComboB = aComboA[kLoop].split(";");
                const aGridData = {
                    value: aComboB[0],
                    label: aComboB[1],
                };
                // 부모 콤보 value (pcode) 처리
                if (aComboB.length === 3 && aComboB[2]) {
                    aGridData.pcode = aComboB[2];
                }
                aGridComboA.push(aGridData);
            }
        }
        aGridComboData.push(aGridComboA);
    }

    return aGridComboData;
}

/**
 * 전역 콤보 데이터 로드 함수
 * 페이지에서 사용할 모든 콤보 데이터를 한 번에 로드하여 파싱된 배열 반환
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

            // gGridComboData 전역 변수 없이 순수 파싱 결과만 반환
            return parseComboList(comboArray);
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
        // 빈 문자열("")은 빈 배열([])로 처리 (데이터 없음 의미)
        Object.keys(result).forEach(key => {
            if (key.startsWith('rsData') && typeof result[key] === 'string') {
                const raw = result[key];
                if (!raw || raw.trim() === '') {
                    // 빈 문자열 → 빈 배열로 정규화 (그리드 클리어 보장)
                    result[key] = [];
                } else {
                    try {
                        result[key] = JSON.parse(raw);
                    } catch (e) {
                        // JSON 파싱 실패 시 빈 배열로 대체 (원본 문자열이 비정상)
                        console.warn(`[CtvCommon] ${key} JSON 파싱 실패, 빈 배열로 처리:`, raw.substring(0, 50));
                        result[key] = [];
                    }
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