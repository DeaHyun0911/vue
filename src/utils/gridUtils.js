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
    return {
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
}

/**
 * 편집권한 그리드 추가 설정
 * @param {Object} instance - 그리드 인스턴스 참조
 * @returns {Object} 편집 가능한 그리드에 추가할 설정 객체
 */
export function getEditableGridConfig(instance) {
    return {
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
                break;
            case "MONTH":
                result.type = "date";
                result.calendarType = 'yearMonth';
                dataTypeCode = "STR";
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