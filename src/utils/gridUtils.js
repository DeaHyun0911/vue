/**
 * Grid Utility Functions
 * SBGrid3 관련 헬퍼 함수 모음
 */

/**
 * SBGrid3 기본 설정 반환
 * @param {Object} instance - 그리드 인스턴스 참조 (contextMenu 핸들러용)
 * @returns {Object} SBGrid3 기본 설정 객체
 */
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

        if (!expandedColumn.colType) {
            return expandedColumn;
        }

        const parsed = parseColType(expandedColumn.colType);
        const { colType, ...rest } = expandedColumn;

        return {
            ...parsed,
            ...rest,
        };
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