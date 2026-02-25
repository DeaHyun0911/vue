/**
 * Grid Utility Functions
 * SBGrid3 관련 헬퍼 함수 모음
 */

/**
 * SBGrid3 기본 설정 반환
 * @param {Object} instance - 그리드 인스턴스 참조 (contextMenu 핸들러용)
 * @returns {Object} SBGrid3 기본 설정 객체
 */

export const GRID_VALIDATORS = {
    // 영문과 숫자만 허용
    code: {
        rule: 'pattern',
        value: '^[a-zA-Z0-9]+$',
        message: '영문과 숫자만 입력 가능합니다.'
    },
    // 숫자만 허용
    number: {
        rule: 'pattern',
        value: '^[0-9]+$',
        message: '숫자만 입력 가능합니다.'
    },
    // 영문만 허용
    alpha: {
        rule: 'pattern',
        value: '^[a-zA-Z]+$',
        message: '영문만 입력 가능합니다.'
    },
    // 한글만 허용
    korean: {
        rule: 'pattern',
        value: '^[가-힣]+$',
        message: '한글만 입력 가능합니다.'
    },
    // 이메일 형식
    email: {
        rule: 'pattern',
        value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        message: '올바른 이메일 형식으로 입력하세요.'
    },
    // 전화번호 형식 (하이픈 포함/미포함 둘 다 허용)
    phone: {
        rule: 'pattern',
        value: '^[0-9-]+$',
        message: '올바른 전화번호 형식으로 입력하세요.'
    },
    password: {
        rule: 'pattern',
        value: '^[a-zA-Z0-9!@#$%^&*()_+\\-=\\[\\]{};:\':"\\\\|,.<>\\/?\\u25CF]+$',
        message: '영문, 숫자, 특수문자 및 ●를 포함하여 8자 이상 입력해 주세요.'
    },
    // 주민번호 형식
    jumin: {
        rule: (inputValue) => {
            // isValidJuminNo가 전역에 있다고 가정
            return typeof window.isValidJuminNo === 'function'
                ? !!window.isValidJuminNo(inputValue)
                : true;
        },
        message: '잘못된 주민번호입니다.'
    }
};

/**
 * 사전 정의된 커스텀 포맷 형식 (customFormat: 'numberOmit' 등)
 */
export const CUSTOM_FORMATS = {
    // Y/N 값을 아이콘으로 표시 (N 값 기준)
    YN: {
        format: (value) => value === 'N'
            ? '<span class="cell-icon no">N</span>'
            : '<span class="cell-icon yes">Y</span>',
        description: 'Y/N 값을 아이콘으로 표시 (N이 no, Y가 yes)'
    },
    // Y/N 값을 아이콘으로 표시 (0 값 기준)
    YN_0: {
        format: (value) => value === '0'
            ? '<span class="cell-icon no">N</span>'
            : '<span class="cell-icon yes">Y</span>',
        description: 'Y/N 값을 아이콘으로 표시 (0이 no, 그 외가 yes)'
    },
    // O/X 값을 아이콘으로 표시 (O 값 기준)
    OX: {
        format: (value) => value === 'O'
            ? '<span class="cell-icon yes">O</span>'
            : '<span class="cell-icon no">X</span>',
        description: 'O/X 값을 아이콘으로 표시 (O가 yes, X가 no)'
    },
};

/**
 * validators 정규화 (문자열 -> 객체 변환)
 * @param {Array|String} validators 
 * @returns {Array} 정규화된 validators 배열
 */
export function normalizeValidators(validators) {
    if (!validators) return [];
    if (!Array.isArray(validators)) {
        validators = [validators];
    }

    return validators.map(validator => {
        // 문자열인 경우: 미리 정의된 패턴 사용
        if (typeof validator === 'string') {
            // 'code:special(-_)' 형식 파싱
            const specialMatch = validator.match(/^(\w+):special\((.+)\)$/);
            if (specialMatch) {
                const [, ruleName, specialChars] = specialMatch;
                const predefined = GRID_VALIDATORS[ruleName];
                if (predefined) {
                    // 특수문자 이스케이프 처리
                    const escapedSpecial = specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    return {
                        ...predefined,
                        value: `^[a-zA-Z0-9${escapedSpecial}]+$`,
                        message: `영문, 숫자, 특수문자(${specialChars})만 입력 가능합니다.`
                    };
                }
            }

            // 일반 미리 정의된 패턴
            const predefined = GRID_VALIDATORS[validator];
            if (predefined) {
                return { ...predefined };
            }
            console.warn(`[gridUtils] 알 수 없는 validator: "${validator}"`);
            return null;
        }

        // 객체인 경우: rule이 문자열이고 미리 정의된 패턴인지 확인
        if (typeof validator === 'object' && validator.rule) {
            const predefined = GRID_VALIDATORS[validator.rule];
            if (predefined) {
                // 미리 정의된 패턴을 기본으로, validator 옵션으로 덮어쓰기
                // special 옵션이 있으면 패턴에 특수문자 추가
                if (validator.special) {
                    const escapedSpecial = validator.special.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    return {
                        ...predefined,
                        value: `^[a-zA-Z0-9${escapedSpecial}]+$`,
                        message: validator.message || `영문, 숫자, 특수문자(${validator.special})만 입력 가능합니다.`,
                        ...validator
                    };
                }
                return { ...predefined, ...validator };
            }
            // 미리 정의되지 않은 경우 그대로 반환
            return validator;
        }

        return validator;
    }).filter(v => v !== null);
}

/**
 * lockType 옵션 처리
 * @param {Array} columns - 컬럼 설정 배열
 * @param {Function} getGridInstance - 그리드 인스턴스를 반환하는 함수 () => grid
 * @returns {Array} 처리된 컬럼 설정 배열
 */
export function applyLockTypeToColumns(columns, getGridInstance) {
    if (!columns || !Array.isArray(columns)) return columns;

    return columns.map((column) => {
        let result = { ...column };

        // 중첩된 columns가 있는 경우 재귀적으로 처리
        if (result.columns && Array.isArray(result.columns)) {
            result.columns = applyLockTypeToColumns(result.columns, getGridInstance);
        }

        // lockType이 없거나 editable/colCss가 이미 명시되어 있으면 스킵
        if (
            !column.lockType ||
            (column.editable !== undefined &&
                column.colCss !== undefined)
        ) {
            return result;
        }

        const lockType = column.lockType;

        if (lockType === "INSERT_ONLY") {
            // editable이 명시되지 않았으면 함수로 설정
            if (result.editable === undefined) {
                result.editable = (data) => {
                    const grid = getGridInstance ? getGridInstance() : null;
                    if (!grid && typeof SBGrid3 === 'undefined') return true;

                    // SBGrid3.getRow 사용 (data._key_ 필요)
                    if (grid && data && data._key_) {
                        const row = SBGrid3.getRow(grid, data._key_);
                        return row && row.status === "insert";
                    }
                    // grid instance가 없거나 data가 명확하지 않을 때 fallback logic?
                    // 보통 data는 row data 자체.
                    return false;
                };
            }

            // colCss가 명시되지 않았으면 함수로 설정
            if (result.colCss === undefined) {
                result.colCss = (data) => {
                    const grid = getGridInstance ? getGridInstance() : null;
                    if (grid && data && data._key_) {
                        const row = SBGrid3.getRow(grid, data._key_);
                        if (row && row.status !== "insert") {
                            return "disabled";
                        }
                    }
                };
            }
        } else if (lockType === "ALWAYS") {
            // editable이 명시되지 않았으면 false로 설정
            if (result.editable === undefined) {
                result.editable = false;
            }

            // colCss가 명시되지 않았으면 함수로 설정
            if (result.colCss === undefined) {
                result.colCss = (data) => {
                    return "disabled";
                };
            }
        }

        // lockType이 있으면 skipPaste: true 추가 (엑셀 붙여넣기 제외)
        if (lockType && result.skipPaste === undefined) {
            result.skipPaste = true;
        }

        // lockType 속성 제거 (SBGrid 설정이 아니므로)
        delete result.lockType;

        return result;
    });
}

export function getDefaultGridConfig(instance) {
    const config = {
        width: "100%",
        height: "100%",
        defaultColumn: {
            showUnSortIcon: false,
            captionClick: "sort",
            directApplyValue: true,
        },
        navigatable: true,
        search: true,
        contextMenu: ["sort", "column"],
        copyable: true,
        sortable: true,
        pasteable: false,
        excelExport: {
            fileName: `grid_export.xlsx`,
            cellStyle: true,
        },
        hover: "row",
        selectable: {
            selectMode: "multi",
            columnSelect: false,
            cellSelect: "cell",
        },
        resizable: {
            mode: "guideLine",
            maxWidth: 500,
            minWidth: 30,
        },
        emptyTemplate: `
            <div class="ctv-empty-result">
                <div class="empty-icon"></div>
                <div class="empty-title">
                    <span>데이터가 존재 하지 않습니다.</span>
                </div>
            </div>
        `,
        alternateCss: ["alternate1"],
        rowHeight: 32,
        captionHeight: 40,
        footerHeight: 40,
        reorderable: {
            column: true
        },
        virtualColumn: true,
    };

    // 행 정보 보기 메뉴 추가
    if (instance && typeof instance.showRowDetailModal === 'function') {
        config.contextMenu.push({
            item: "showRowDetail",
            enabled: true,
            label: "행정보 보기",
            icon: "eye",
            click: (grid, column, rowItem) => {
                instance.showRowDetailModal(grid, column, rowItem);
            },
        });
    }

    return config;
}

/**
 * 편집권한 그리드 추가 설정
 * @param {Object} instance - 그리드 인스턴스 참조
 * @returns {Object} 편집 가능한 그리드에 추가할 설정 객체
 */
export function getEditableGridConfig(instance) {
    const config = {
        showStatus: true,
        navigatable: { tabToNextCell: { edit: true } },
        hideDeleted: true,
        editable: {
            immediateValidationCheck: true,
            allowFocusOutInvalid: true,
        },
        copyable: {
            fill: true,
            textCopyMode: 'value'
        },
        pasteable: true,
        contextMenu: ["sort", "undo", "redo", "column"],
    };

    // 현위치에 추가 메뉴 추가
    if (instance && typeof instance.pasteClipboardData === 'function') {
        config.contextMenu.push({
            item: "addPasteRow",
            enabled: true,
            label: "현위치에 추가",
            icon: "addRow",
            click: (grid, column, rowItem) => {
                instance.pasteClipboardData();
            },
        });
    }

    // 행 정보 보기 메뉴 추가
    if (instance && typeof instance.showRowDetailModal === 'function') {
        config.contextMenu.push({
            item: "showRowDetail",
            enabled: true,
            label: "행정보 보기",
            icon: "eye",
            click: (grid, column, rowItem) => {
                instance.showRowDetailModal(grid, column, rowItem);
            },
        });
    }

    return config;
}

/**
 * colType 축약 코드를 파싱하여 속성으로 변환
 * @param {string} colType - 축약 코드 (예: "STR|C|NN|M")
 * @returns {Object} 파싱된 속성 객체
 */
export function parseColType(colType) {
    if (!colType || typeof colType !== "string") return {};

    const result = {};
    const codes = colType.toUpperCase().split("|");

    const WIDTH_PRESETS = {
        XS: 50,
        S: 80,
        M: 120,
        XM: 150,
        XL: 200,
        XXL: 250,
        XXXL: 300,
    };

    let constraintCode = "";
    let dataTypeCode = "";

    codes.forEach((code) => {
        code = code.trim();
        if (!code) return;

        if (/^\d+$/.test(code)) {
            result.width = parseInt(code, 10);
            return;
        }

        if (WIDTH_PRESETS[code] !== undefined) {
            result.width = WIDTH_PRESETS[code];
            return;
        }

        switch (code) {
            case "STR":
            case "STRING":
                result.dataType = "string";
                dataTypeCode = "STR";
                break;
            case "NUM":
            case "NUMBER":
                result.dataType = "number";
                dataTypeCode = "NUM";
                break;
            case "DATE":
                result.type = "date";
                result.calendarType = 'date';
                dataTypeCode = "STR";

                result.valueFormat = (value) => {
                    return Replace(value, "-", "");
                };
                result.format = 'yyyy-MM-dd';
                result.formatInputValue = (value) => {
                    if (!value || typeof value !== 'string') return value || '';
                    return value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
                };
                result.getValue = (value) => {
                    if (!value || typeof value !== 'string') return value || '';
                    return value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
                };
                break;
            case "MONTH":
                result.type = "date";
                result.calendarType = 'yearMonth';
                dataTypeCode = "STR";

                result.valueFormat = (value) => {
                    return Replace(value, "-", "");
                };
                result.format = 'yyyy-MM';
                result.formatInputValue = (value) => {
                    if (!value || typeof value !== 'string') return value || '';
                    return value.replace(/^(\d{4})(\d{2})$/, '$1-$2');
                };
                result.getValue = (value) => {
                    if (!value || typeof value !== 'string') return value || '';
                    return value.replace(/^(\d{4})(\d{2})$/, '$1-$2');
                };
                break;
            case "L":
            case "LEFT":
                result.align = "left";
                break;
            case "C":
            case "CENTER":
                result.align = "center";
                break;
            case "R":
            case "RIGHT":
                result.align = "right";
                break;
            case "PK":
            case "PRIMARYKEY":
                result.required = true;
                result.skipPaste = true;
                result.isPrimaryKey = true;
                constraintCode = "PK";
                break;
            case "NN":
            case "REQ":
            case "REQUIRED":
                result.required = true;
                if (!constraintCode) constraintCode = "NN";
                break;
            case "H":
            case "HIDE":
            case "HIDDEN":
                result.visible = false;
                break;
            case "RO":
            case "READONLY":
                result.editable = false;
                break;
            case "SP":
            case "SKIPPASTE":
                result.skipPaste = true;
                break;
            case "EX":
            case "EXCLUDE":
                result.saveExclude = true;
                if (!constraintCode) constraintCode = "EX";
                break;
            default:
                if (code.indexOf(":") > -1) {
                    const idx = code.indexOf(":");
                    const key = code.substring(0, idx).trim();
                    let val = code.substring(idx + 1).trim();

                    if (val === "true") val = true;
                    else if (val === "false") val = false;
                    else if (!isNaN(val) && val !== "") val = Number(val);

                    if (key) result[key] = val;
                }
                break;
        }
    });

    if (constraintCode || dataTypeCode) {
        result.ptaxsData = constraintCode + "\x07" + dataTypeCode;
    }

    return result;
}

/**
 * columns 배열의 colType을 파싱하여 속성 적용
 * @param {Array} columns - 컬럼 설정 배열
 * @returns {Array} 처리된 컬럼 설정 배열
 */
export function applyColTypeToColumns(columns) {
    if (!columns || !Array.isArray(columns)) return columns;

    return columns.map((column) => {
        let expandedColumn = { ...column };

        // 중첩된 columns가 있는 경우 재귀적으로 처리
        if (expandedColumn.columns && Array.isArray(expandedColumn.columns)) {
            expandedColumn.columns = applyColTypeToColumns(expandedColumn.columns);
        }

        // customFormat 처리 (미리 정의된 포맷 패턴 적용)
        if (expandedColumn.customFormat && typeof expandedColumn.customFormat === 'string') {
            const formatPattern = CUSTOM_FORMATS[expandedColumn.customFormat];
            if (formatPattern && formatPattern.format) {
                expandedColumn.format = formatPattern.format;
            } else {
                console.warn(`[CtvDataGrid] 알 수 없는 customFormat: "${expandedColumn.customFormat}"`);
            }
            delete expandedColumn.customFormat;
        }

        // combo/inputCombo 처리
        if (column.combo !== undefined) {
            expandedColumn.type = "combo";
            if (typeof column.combo === "number") {
                if (!expandedColumn.typeinfo) {
                    expandedColumn.typeinfo = {};
                }
                expandedColumn.items = `gGridComboData[${column.combo}]`;
            } else {
                expandedColumn.items = column.combo;
            }
            delete expandedColumn.combo;
        }

        if (column.inputCombo !== undefined) {
            expandedColumn.type = "combo";
            expandedColumn.autoComplete = true;
            if (typeof column.inputCombo === "number") {
                if (!expandedColumn.typeinfo) {
                    expandedColumn.typeinfo = {};
                }
                expandedColumn.items = `gGridComboData[${column.inputCombo}]`;
            } else {
                expandedColumn.items = column.inputCombo;
            }
            delete expandedColumn.inputCombo;
        }

        // required validator 처리 함수
        const applyRequired = (col) => {
            if (col.required !== true) return;

            // captionCss 처리
            if (col.captionCss) {
                if (typeof col.captionCss === "string") {
                    if (!col.captionCss.includes("required")) col.captionCss += " required";
                } else if (Array.isArray(col.captionCss)) {
                    if (!col.captionCss.includes("required")) col.captionCss.push("required");
                }
            } else {
                col.captionCss = "required";
            }

            // validator 처리
            let captionValue = "";
            if (col.caption) {
                if (Array.isArray(col.caption)) captionValue = col.caption[0];
                else captionValue = col.caption;
                captionValue = String(captionValue).replace(/\n/g, "").trim();
            }
            if (!captionValue && col.field) captionValue = col.field;
            if (!captionValue) captionValue = "이 항목";

            if (!col.validators) col.validators = [];
            else if (!Array.isArray(col.validators)) col.validators = [col.validators];

            const hasRequired = col.validators.some(v => v && (v.rule === 'required' || v.rule === 'Required'));
            if (!hasRequired) {
                col.validators.push({
                    rule: "required",
                    message: captionValue + "는 필수값입니다."
                });
            } else {
                // 메시지 업데이트? (선택)
            }
        };

        if (!expandedColumn.colType) {
            // colType이 없어도 required나 validators는 처리해야 함
            applyRequired(expandedColumn);
            if (expandedColumn.validators) {
                expandedColumn.validators = normalizeValidators(expandedColumn.validators);
            }
            return expandedColumn;
        }

        const parsed = parseColType(expandedColumn.colType);
        const { colType, ...rest } = expandedColumn;

        const result = {
            ...parsed,
            ...rest,
        };

        // dataType에 따른 기본 validator 추가
        if (parsed.dataType === "number" || parsed.dataType === "date") {
            let validators = result.validators || [];
            if (!Array.isArray(validators)) validators = [validators];

            const hasTypeValidator = validators.some(v => v && v.rule === "type");

            if (!hasTypeValidator) {
                if (parsed.dataType === "number") {
                    validators.push({
                        rule: "type",
                        value: "number",
                        message: "숫자로 입력하세요."
                    });
                } else if (parsed.dataType === "date") {
                    validators.push({
                        rule: "type",
                        value: "date",
                        message: "올바른 날짜 형식으로 입력하세요."
                    });
                }
                result.validators = validators;
            }
        }

        applyRequired(result);

        if (result.validators) {
            result.validators = normalizeValidators(result.validators);
        }

        return result;
    });
}

/**
 * defaultUnit 옵션 처리 (모든 컬럼에 기본 unit 적용)
 * @param {Array} columns - 컬럼 설정 배열
 * @param {string} defaultUnit - 기본 unit 값
 * @returns {Array} 처리된 컬럼 설정 배열
 */
export function applyDefaultUnitToColumns(columns, defaultUnit) {
    if (!columns || !Array.isArray(columns) || !defaultUnit) return columns;

    return columns.map((column) => {
        let result = { ...column };

        // unit이 명시되지 않았고 width가 숫자형이면 defaultUnit 적용
        if (!result.unit && typeof result.width === 'number') {
            result.unit = defaultUnit;
        }

        // 중첩된 columns가 있는 경우 재귀적으로 처리
        if (result.columns && Array.isArray(result.columns)) {
            result.columns = applyDefaultUnitToColumns(result.columns, defaultUnit);
        }

        return result;
    });
}

/**
 * 2. Tree 구조의 columns를 SBGrid3 다중 헤더 형식으로 변환
 *
 *  - 일반 컬럼({ field, caption, ... })은 그대로 반환
 *  - 그룹 컬럼({ caption, columns: [...] })은 SBGrid3 가이드 형식으로 변환:
 *      { columns: [리프컬럼들], captions: [행렬], rows: [마지막행] }
 *
 * 반환: { columns: SBGrid3에 직접 전달할 혼합 배열, captions: null }
 *  (captions: null은 CtvDataGrid에서 "이미 변환된 상태"를 의미)
 *
 * SBGrid3 가이드 예시:
 *   columns: [
 *     { field: 'name', caption: '이름' },          // 일반컬럼 → TextColumn
 *     {                                             // 그룹컬럼 → GridColumn_GridColumn
 *       columns: [{ field: 'a' }, { field: 'b' }],
 *       captions: [['그룹명', '그룹명'], ['A', 'B']],
 *       rows: [['A', 'B']],
 *     }
 *   ]
 */
export function parseTreeColumns(columns) {
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
        return { columns: [], captions: null };
    }

    // 하위 columns를 가진 그룹이 존재하는지 확인
    const hasGroup = columns.some(col => Array.isArray(col.columns) && col.columns.length > 0);

    // 그룹이 없으면 변환 불필요 — 기존 배열 그대로 반환
    if (!hasGroup) {
        return { columns, captions: null };
    }

    // ──────────────────────────────────────────────────────
    // 내부 헬퍼: 그룹 컬럼 1개를 SBGrid3 형식으로 변환
    // ──────────────────────────────────────────────────────
    const convertGroup = (groupDef) => {
        // 최대 깊이 계산
        const getDepth = (cols) => {
            let max = 0;
            for (const c of cols) {
                if (Array.isArray(c.columns) && c.columns.length > 0) {
                    max = Math.max(max, 1 + getDepth(c.columns));
                } else {
                    max = Math.max(max, 1);
                }
            }
            return max;
        };

        const maxDepth = 1 + getDepth(groupDef.columns); // 루트 그룹 포함
        const flatLeafs = [];
        const captionsMatrix = Array.from({ length: maxDepth }, () => []);
        const groupCaptions = new Set(); // 중간 그룹 캡션 추적 (더미 컬럼 생성용)

        // DFS: 리프 컬럼 수집 + captions 행렬 구성
        const traverse = (cols, depth, ancestorCaptions) => {
            for (const col of cols) {
                const caption = Array.isArray(col.caption) ? (col.caption[0] || '') : (col.caption || col.field || '');

                if (Array.isArray(col.columns) && col.columns.length > 0) {
                    // 그룹 노드 — 재귀 탐색 + 캡션 기록
                    groupCaptions.add(caption);
                    traverse(col.columns, depth + 1, [...ancestorCaptions, caption]);
                } else {
                    // 리프 노드
                    const pathRow = [...ancestorCaptions, caption];
                    // 패딩: 현재 depth가 maxDepth보다 얕으면 마지막 캡션으로 채움
                    while (pathRow.length < maxDepth) pathRow.push(caption);

                    for (let i = 0; i < maxDepth; i++) {
                        captionsMatrix[i].push(pathRow[i]);
                    }

                    const flatCol = { ...col };
                    delete flatCol.columns;
                    flatLeafs.push(flatCol);
                }
            }
        };

        // 루트 그룹의 캡션을 최상단 행에 채워줌 + 루트도 그룹 캡션으로 기록
        const rootCaption = Array.isArray(groupDef.caption) ? (groupDef.caption[0] || '') : (groupDef.caption || '');
        groupCaptions.add(rootCaption);
        traverse(groupDef.columns, 1, [rootCaption]);

        // ★ SBGrid3 필수: captions에 선언된 그룹 캡션은 columns 안에 실제로 존재해야 함
        // 리프 캡션과 겹치지 않는 그룹 캡션을 더미 컬럼으로 추가
        const leafCaptions = new Set(flatLeafs.map(c => Array.isArray(c.caption) ? c.caption[0] : c.caption));
        let dummyIdx = 1;
        groupCaptions.forEach(gCaption => {
            if (gCaption && !leafCaptions.has(gCaption)) {
                flatLeafs.push({
                    field: `__GROUP_DUMMY_${dummyIdx++}__`,
                    caption: gCaption,
                });
            }
        });

        return {
            columns: flatLeafs,
            captions: captionsMatrix,
            rows: [captionsMatrix[captionsMatrix.length - 1]],
        };
    };

    // ──────────────────────────────────────────────────────
    // 상위 columns 배열을 순회하여 혼합 배열 생성
    // ──────────────────────────────────────────────────────
    const result = columns.map(col => {
        if (Array.isArray(col.columns) && col.columns.length > 0) {
            // 그룹 컬럼 → SBGrid3 다중헤더 형식으로 변환
            return convertGroup(col);
        } else {
            // 일반 컬럼 → 그대로 반환
            return { ...col };
        }
    });

    // CtvDataGrid는 captions: null 이면 columns를 createGrid()에 직접 넘김
    return { columns: result, captions: null };
}



export function _getEditable() {
    try {
        if (typeof top === 'undefined' ||
            !top.gTopAces?.mMain?.Tabs ||
            top.gTopAces.mMain.mSelectIdx === undefined) {
            return true; // 탭 정보 없으면 기본값
        }

        const gMenuTabinfo = top.gTopAces.mMain.Tabs[top.gTopAces.mMain.mSelectIdx];

        // insauth === '2'면 저장권한(편집 가능)
        return gMenuTabinfo?.insauth === '2';
    } catch (error) {
        console.warn('[CTV Component] 권한 확인 오류:', error);
        return true; // 오류 시 기본값
    }
}