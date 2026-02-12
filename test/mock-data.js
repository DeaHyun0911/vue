(function () {
    window.MockData = {
        // 공통 콤보 데이터
        combos: {
            FG_SYS: [
                { value: 'S01', text: '시스템관리', label: '시스템관리' },
                { value: 'S02', text: '인사관리', label: '인사관리' },
                { value: 'S03', text: '회계관리', label: '회계관리' },
                { value: 'S04', text: '영업관리', label: '영업관리' },
                { value: 'S05', text: '생산관리', label: '생산관리' }
            ],
            YN_USE: [
                { value: 'Y', text: '사용', label: '사용' },
                { value: 'N', text: '미사용', label: '미사용' }
            ],
            BS_GUBN: [
                { value: 'B01', text: '기본업무', label: '기본업무' },
                { value: 'B02', text: '확장업무', label: '확장업무' }
            ],
            // test-grid.js 전용 콤보
            MC_MENU: [
                { value: 'M001', label: '공통관리' },
                { value: 'M002', label: '인사/급여' },
                { value: 'M003', label: '회계/재무' },
                { value: 'M004', label: '영업/물류' },
                { value: 'M005', label: '생산/제조' }
            ],
            MC_AMD_TYPE: [
                { value: 'A01', label: '전체권한' },
                { value: 'A02', label: '읽기전용' },
                { value: 'A03', label: '쓰기전용' }
            ],
            MC_PGM_TYPE: [
                { value: 'T01', label: '단일등록' },
                { value: 'T02', label: '목록조회' },
                { value: 'T03', label: '복합처리' },
                { value: 'T04', label: '레포트' }
            ],
            PGM_FOLDER: [
                { value: 'F01', label: '/System' },
                { value: 'F02', label: '/HumanResource' },
                { value: 'F03', label: '/Finance' },
                { value: 'F04', label: '/Sales' }
            ],
            MC_MODL_TYPE: [
                { value: 'MD01', label: '기반모듈' },
                { value: 'MD02', label: '업무모듈' },
                { value: 'MD03', label: '분석모듈' }
            ]
        },

        // 프로그램 목록 데이터 (test-grid.js 용)
        programs: [
            { MC_MENU: 'M001', ID_PGM: 'SYS001', NM_KOR_PGM: '사용자관리', NM_ENG_PGM: 'User Management', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F01', YN_USE: 'Y', MC_MODL_TYPE: 'MD01', BIGO: '시스템 사용자 등록 및 권한 설정', NO_PGM: 1 },
            { MC_MENU: 'M001', ID_PGM: 'SYS002', NM_KOR_PGM: '메뉴관리', NM_ENG_PGM: 'Menu Management', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T03', PGM_FOLDER: 'F01', YN_USE: 'Y', MC_MODL_TYPE: 'MD01', BIGO: '시스템 메뉴 구조 관리', NO_PGM: 2 },
            { MC_MENU: 'M001', ID_PGM: 'SYS003', NM_KOR_PGM: '공통코드관리', NM_ENG_PGM: 'Common Code Mgmt', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F01', YN_USE: 'Y', MC_MODL_TYPE: 'MD01', BIGO: '공통코드 마스터/디테일 관리', NO_PGM: 3 },
            { MC_MENU: 'M002', ID_PGM: 'HR001', NM_KOR_PGM: '인사카드등록', NM_ENG_PGM: 'Personnel Card', MC_AMD_TYPE: 'A02', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F02', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '임직원 인사 정보 등록', NO_PGM: 1 },
            { MC_MENU: 'M002', ID_PGM: 'HR002', NM_KOR_PGM: '급여대장조회', NM_ENG_PGM: 'Payroll Sheet', MC_AMD_TYPE: 'A03', MC_PGM_TYPE: 'T02', PGM_FOLDER: 'F02', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '월별 급여 대장 조회', NO_PGM: 2 },
            { MC_MENU: 'M003', ID_PGM: 'ACC001', NM_KOR_PGM: '전표입력', NM_ENG_PGM: 'Slip Entry', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T03', PGM_FOLDER: 'F03', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '회계 전표 입력 및 승인', NO_PGM: 1 },
            { MC_MENU: 'M003', ID_PGM: 'ACC002', NM_KOR_PGM: '재무상태표', NM_ENG_PGM: 'Balance Sheet', MC_AMD_TYPE: 'A02', MC_PGM_TYPE: 'T04', PGM_FOLDER: 'F03', YN_USE: 'N', MC_MODL_TYPE: 'MD03', BIGO: '현재 미사용 (구버전)', NO_PGM: 2 },
            { MC_MENU: 'M004', ID_PGM: 'SAL001', NM_KOR_PGM: '수주등록', NM_ENG_PGM: 'Sales Order', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F04', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '고객 주문 등록', NO_PGM: 1 },
            { MC_MENU: 'M004', ID_PGM: 'SAL002', NM_KOR_PGM: '출고처리', NM_ENG_PGM: 'Delivery Proc', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T03', PGM_FOLDER: 'F04', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '물품 출고 처리', NO_PGM: 2 },
            { MC_MENU: 'M005', ID_PGM: 'PROD001', NM_KOR_PGM: '생산계획', NM_ENG_PGM: 'Production Plan', MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T03', PGM_FOLDER: 'F04', YN_USE: 'Y', MC_MODL_TYPE: 'MD02', BIGO: '월간 생산 계획 수립', NO_PGM: 1 },
        ],

        // 공통 코드 마스터 (test-grid-form.js, test-grid-layout.js 등)
        commonCodes: [
            { CD_MST: 'C001', NM_CODE: '직급코드', FG_SYS: 'S02', YN_USE: 'Y', LENG: '3', BIGO: '사원, 대리, 과장 등' },
            { CD_MST: 'C002', NM_CODE: '부서코드', FG_SYS: 'S02', YN_USE: 'Y', LENG: '4', BIGO: '조직도 부서 코드' },
            { CD_MST: 'C003', NM_CODE: '은행코드', FG_SYS: 'S03', YN_USE: 'Y', LENG: '3', BIGO: '금융기관 식별 코드' },
            { CD_MST: 'C004', NM_CODE: '계정과목', FG_SYS: 'S03', YN_USE: 'Y', LENG: '5', BIGO: '회계 계정 과목' },
            { CD_MST: 'C005', NM_CODE: '거래처구분', FG_SYS: 'S04', YN_USE: 'Y', LENG: '2', BIGO: '매입/매출 거래처 구분' },
            { CD_MST: 'C006', NM_CODE: '품목유형', FG_SYS: 'S05', YN_USE: 'Y', LENG: '2', BIGO: '원자재, 반제품, 완제품' },
            { CD_MST: 'C007', NM_CODE: '단위코드', FG_SYS: 'S01', YN_USE: 'Y', LENG: '2', BIGO: 'EA, KG, M, Box 등' },
            { CD_MST: 'C008', NM_CODE: '지역코드', FG_SYS: 'S04', YN_USE: 'N', LENG: '3', BIGO: '국내 지역 구분 (구버전)' },
            { CD_MST: 'C009', NM_CODE: '결재상태', FG_SYS: 'S01', YN_USE: 'Y', LENG: '1', BIGO: '전자결재 진행 상태' },
            { CD_MST: 'C010', NM_CODE: '창고코드', FG_SYS: 'S05', YN_USE: 'Y', LENG: '4', BIGO: '물류 창고 위치' },
        ],

        // 공통 코드 상세
        commonCodeDetails: [
            // 직급코드 (C001)
            { CD_MST: 'C001', CD_DTL: '01', NM_CODE: '사원', YN_USE: 'Y', BIGO: 'Entry Level' },
            { CD_MST: 'C001', CD_DTL: '02', NM_CODE: '대리', YN_USE: 'Y', BIGO: 'Associate' },
            { CD_MST: 'C001', CD_DTL: '03', NM_CODE: '과장', YN_USE: 'Y', BIGO: 'Manager' },
            { CD_MST: 'C001', CD_DTL: '04', NM_CODE: '차장', YN_USE: 'Y', BIGO: 'Senior Manager' },
            { CD_MST: 'C001', CD_DTL: '05', NM_CODE: '부장', YN_USE: 'Y', BIGO: 'Director' },
            // 부서코드 (C002)
            { CD_MST: 'C002', CD_DTL: 'D001', NM_CODE: '경영지원팀', YN_USE: 'Y', BIGO: 'Management Support' },
            { CD_MST: 'C002', CD_DTL: 'D002', NM_CODE: '개발1팀', YN_USE: 'Y', BIGO: 'R&D Team 1' },
            { CD_MST: 'C002', CD_DTL: 'D003', NM_CODE: '개발2팀', YN_USE: 'Y', BIGO: 'R&D Team 2' },
            { CD_MST: 'C002', CD_DTL: 'D004', NM_CODE: '영업팀', YN_USE: 'Y', BIGO: 'Sales Team' },
            // 은행코드 (C003)
            { CD_MST: 'C003', CD_DTL: '004', NM_CODE: '국민은행', YN_USE: 'Y', BIGO: 'KB Kookmin' },
            { CD_MST: 'C003', CD_DTL: '088', NM_CODE: '신한은행', YN_USE: 'Y', BIGO: 'Shinhan' },
            { CD_MST: 'C003', CD_DTL: '020', NM_CODE: '우리은행', YN_USE: 'Y', BIGO: 'Woori' },
            // 품목유형 (C006)
            { CD_MST: 'C006', CD_DTL: '10', NM_CODE: '원자재', YN_USE: 'Y', BIGO: 'Raw Material' },
            { CD_MST: 'C006', CD_DTL: '20', NM_CODE: '부자재', YN_USE: 'Y', BIGO: 'Sub Material' },
            { CD_MST: 'C006', CD_DTL: '30', NM_CODE: '완제품', YN_USE: 'Y', BIGO: 'Finished Goods' },
        ]
    };

    // Global mock setup
    window.top = window.top || {};
    window.top.gSInfo = window.top.gSInfo || {};
    window.top.gSInfo.ERPSDB = 'TEST_DB';
    window.ERPSDB = 'ERPSDB';
    window.top.mwHourglassHide = function () {
        // console.log('Loading complete');
    };

    // ===== window.Ctv Setup =====
    window.Ctv = window.Ctv || {};

    window.Ctv.setCombo = async (targetObj, definitions) => {
        // console.log("[Mock-Data] setCombo called", definitions);
        await new Promise(r => setTimeout(r, 100)); // Simulate delay

        Object.keys(definitions).forEach(key => {
            if (targetObj[key] !== undefined) {
                // MockData.combos에 있으면 사용, 없으면 빈 배열
                targetObj[key] = window.MockData.combos[key] || [];
            }
        });
    };

    window.Ctv.dataQuery = async (options) => {
        // console.log("[Mock-Data] dataQuery called", options);
        await new Promise(r => setTimeout(r, 200)); // Simulate delay

        const { funcNm, bParam } = options;

        if (funcNm === "UfnQueryProgram") {
            return {
                rsData01: JSON.parse(JSON.stringify(window.MockData.programs))
            };
        }

        if (funcNm === "UfnQueryCodeMaster") {
            return {
                rsData01: JSON.parse(JSON.stringify(window.MockData.commonCodes))
            };
        }

        if (funcNm === "UfnQueryCodeDetail") {
            const masterCode = bParam && bParam[1] ? bParam[1] : '';
            const details = window.MockData.commonCodeDetails.filter(d => d.CD_MST === masterCode);
            return {
                rsData02: JSON.parse(JSON.stringify(details))
            };
        }

        // Default Fallback
        if (funcNm === "UfnQuery") {
            // 기본값으로 CodeMaster 리턴 (가장 범용적)
            return {
                rsData01: JSON.parse(JSON.stringify(window.MockData.commonCodes))
            };
        }

        if (funcNm === "UfnQueryDetail") {
            const masterCode = bParam && bParam[1] ? bParam[1] : '';
            const details = window.MockData.commonCodeDetails.filter(d => d.CD_MST === masterCode);
            return {
                rsData02: JSON.parse(JSON.stringify(details))
            };
        }

        return {};
    };
})();
