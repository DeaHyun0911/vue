(function () {
    const { ref, reactive, onMounted, computed } = window.Vue;

    // ===== Mock 설정 =====
    const originalCtv = window.Ctv || {};

    window.Ctv = {
        ...originalCtv,
        setCombo: async function (options, config) {
            const mockComboData = {
                MC_MENU: [
                    { value: 'M001', label: '시스템관리' },
                    { value: 'M002', label: '인사관리' },
                    { value: 'M003', label: '급여관리' },
                    { value: 'M004', label: '회계관리' }
                ],
                MC_AMD_TYPE: [
                    { value: 'A01', label: '관리자' },
                    { value: 'A02', label: '사용자' },
                    { value: 'A03', label: '조회' }
                ],
                MC_PGM_TYPE: [
                    { value: 'T01', label: '입력' },
                    { value: 'T02', label: '조회' },
                    { value: 'T03', label: '리포트' }
                ],
                PGM_FOLDER: [
                    { value: 'F01', label: '/cBase' },
                    { value: 'F02', label: '/cPayTax' },
                    { value: 'F03', label: '/cHR' }
                ],
                YN_USE: [
                    { value: 'Y', label: '사용' },
                    { value: 'N', label: '미사용' }
                ],
                MC_MODL_TYPE: [
                    { value: 'MD01', label: '기본모듈' },
                    { value: 'MD02', label: '급여모듈' },
                    { value: 'MD03', label: '인사모듈' }
                ]
            };

            for (const key in config) {
                if (mockComboData[key]) {
                    options[key] = mockComboData[key];
                }
            }

            return new Promise(resolve => setTimeout(resolve, 500));
        },
    };

    window.Ctv.dataQuery = async function (config) {
        const mockGridData = [
            {
                MC_MENU: 'M001', ID_PGM_TOP: '', NO_PGM: 0,
                ID_PGM: 'BPA100N', NM_KOR_PGM: '프로그램등록',
                NM_ENG_PGM: 'Program Registration', NM_CHN_PGM: '程序注册',
                MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F01',
                YN_USE: 'Y', MC_MODL_TYPE: 'MD01',
                DT_PATCH_FIR: '2024-01-01', DT_PATCH_LST: '2024-12-31',
                BIGO: '기본 프로그램 관리 화면',
                TM_REG: '2024-01-01 09:00:00', TM_UPT: '2024-12-31 18:00:00',
                ROWID: 'R001'
            },
            {
                MC_MENU: 'M001', ID_PGM_TOP: '', NO_PGM: 1,
                ID_PGM: 'BPA200N', NM_KOR_PGM: '사용자관리',
                NM_ENG_PGM: 'User Management', NM_CHN_PGM: '用户管理',
                MC_AMD_TYPE: 'A01', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F01',
                YN_USE: 'Y', MC_MODL_TYPE: 'MD01',
                DT_PATCH_FIR: '2024-02-01', DT_PATCH_LST: '2024-11-30',
                BIGO: '사용자 등록 및 권한 관리',
                TM_REG: '2024-02-01 09:00:00', TM_UPT: '2024-11-30 18:00:00',
                ROWID: 'R002'
            },
            {
                MC_MENU: 'M002', ID_PGM_TOP: '', NO_PGM: 2,
                ID_PGM: 'HRM100N', NM_KOR_PGM: '인사기본등록',
                NM_ENG_PGM: 'HR Basic Registration', NM_CHN_PGM: '人事基本登记',
                MC_AMD_TYPE: 'A02', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F03',
                YN_USE: 'Y', MC_MODL_TYPE: 'MD03',
                DT_PATCH_FIR: '2024-03-01', DT_PATCH_LST: '2024-10-15',
                BIGO: '인사 기본정보 입력',
                TM_REG: '2024-03-01 09:00:00', TM_UPT: '2024-10-15 18:00:00',
                ROWID: 'R003'
            },
            {
                MC_MENU: 'M003', ID_PGM_TOP: '', NO_PGM: 3,
                ID_PGM: 'PAY100N', NM_KOR_PGM: '급여계산',
                NM_ENG_PGM: 'Payroll Calculation', NM_CHN_PGM: '工资计算',
                MC_AMD_TYPE: 'A02', MC_PGM_TYPE: 'T02', PGM_FOLDER: 'F02',
                YN_USE: 'N', MC_MODL_TYPE: 'MD02',
                DT_PATCH_FIR: '2024-04-01', DT_PATCH_LST: '2024-09-30',
                BIGO: '월 급여 계산 및 조회 화면',
                TM_REG: '2024-04-01 09:00:00', TM_UPT: '2024-09-30 18:00:00',
                ROWID: 'R004'
            },
            {
                MC_MENU: 'M004', ID_PGM_TOP: '', NO_PGM: 4,
                ID_PGM: 'ACC100N', NM_KOR_PGM: '전표입력',
                NM_ENG_PGM: 'Voucher Entry', NM_CHN_PGM: '凭证录入',
                MC_AMD_TYPE: 'A03', MC_PGM_TYPE: 'T01', PGM_FOLDER: 'F01',
                YN_USE: 'Y', MC_MODL_TYPE: 'MD01',
                DT_PATCH_FIR: '2024-05-01', DT_PATCH_LST: '2024-12-01',
                BIGO: '',
                TM_REG: '2024-05-01 09:00:00', TM_UPT: '2024-12-01 18:00:00',
                ROWID: 'R005'
            }
        ];

        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ rsData01: mockGridData });
            }, 300);
        });
    };

    // Global mock setup
    window.top = window.top || {};
    window.top.gSInfo = window.top.gSInfo || {};
    window.top.gSInfo.ERPSDB = 'TEST_DB';
    window.ERPSDB = 'ERPSDB';
    window.top.mwHourglassHide = function () {
        console.log('Loading complete');
    };

    // ===== 페이지 설정 =====
    window.onPageSetup = function () {
        const comboLoaded = ref(false);

        // 콤보 데이터
        const options = reactive({
            MC_MENU: [],
            MC_PGM_TYPE: [],
            MC_AMD_TYPE: [],
            PGM_FOLDER: [],
            YN_USE: [],
            MC_MODL_TYPE: [],
        });

        // syncForm용 폼 상태 (그리드 포커스행과 동기화할 필드들)
        const form = reactive({
            ID_PGM: '',
            NM_KOR_PGM: '',
            NM_ENG_PGM: '',
            YN_USE: '',
            BIGO: '',
        });

        // 검색 필터 필드
        const filterFields = computed(() => [
            {
                component: 'ctv-select',
                field: 'MC_MENU',
                props: { title: '매뉴대분류', options: options.MC_MENU }
            },
            {
                component: 'ctv-select',
                field: 'MC_PGM_TYPE',
                props: { title: '프로그램타입', options: options.MC_PGM_TYPE }
            },
            {
                component: 'ctv-input',
                field: 'ID_PGM',
                props: { title: '프로그램ID', placeholder: '프로그램ID 입력' }
            },
            {
                component: 'ctv-input',
                field: 'NM_KOR_PGM',
                props: { title: '프로그램명', placeholder: '프로그램명 입력' }
            }
        ]);

        // 그리드 설정 (gridConfig 함수)
        const gridConfig = (state) => ({
            defaultUnit: '%',
            columns: [
                {
                    field: 'MC_MENU', caption: '메뉴대분류',
                    colType: 'C|NN|STR|M|SP',
                    inputCombo: options.MC_MENU,
                },
                { field: 'ID_PGM_TOP', caption: '상위ID', colType: 'STR|C|NN|S' },
                { field: 'NO_PGM', caption: '순서', colType: 'NUM|C|NN|XS' },
                { field: 'ID_PGM', caption: '프로그램ID', colType: 'STR|L|NN|M' },
                { field: 'NM_KOR_PGM', caption: '프로그램명(한국어)', colType: 'STR|L|NN|XL' },
                { field: 'NM_ENG_PGM', caption: '프로그램명(영어)', colType: 'STR|L|XL' },
                { field: 'NM_CHN_PGM', caption: '프로그램명(중국어)', colType: 'STR|L|XL' },
                { field: 'MC_AMD_TYPE', caption: '권한분류', colType: 'STR|C|NN|M', type: 'combo', combo: options.MC_AMD_TYPE },
                { field: 'MC_PGM_TYPE', caption: '타입', colType: 'STR|C|NN|M', type: 'combo', inputCombo: options.MC_PGM_TYPE },
                { field: 'PGM_FOLDER', caption: '폴더', colType: 'STR|C|NN|M', type: 'combo', combo: options.PGM_FOLDER },
                { field: 'YN_USE', caption: '사용유무', colType: 'STR|C|NN|S', type: 'combo', combo: options.YN_USE },
                { field: 'MC_MODL_TYPE', caption: '업무모듈구분', colType: 'STR|C|NN|M', type: 'combo', combo: options.MC_MODL_TYPE },
                { field: 'DT_PATCH_FIR', caption: '최초패치일자', colType: 'STR|H|EX' },
                { field: 'DT_PATCH_LST', caption: '최종패치일자', colType: 'STR|H|EX' },
                { field: 'BIGO', caption: '비고', colType: 'STR|L|XL|SP' },
                { field: 'TM_REG', caption: '등록일시', colType: 'STR|H|EX' },
                { field: 'TM_UPT', caption: '수정일시', colType: 'STR|H|EX' },
                { field: 'ROWID', caption: '행ID', colType: 'STR|H|EX' },
            ],
            rowCss: (data) => data.NO_PGM == 0 ? 'row-highlight' : '',
        });

        // ===== 통합 setting 객체 (syncForm 포함) =====
        const masterGrid = reactive({
            id: 'grid1',
            title: '프로그램등록',
            editable: true,
            gridConfig: gridConfig,
            query: {
                path: 'Bpa100n.ashx',
                funcNm: 'UfnQuery',
                filterRef: 'filter1',
                params: (filterValues) => [
                    window.top.gSInfo[window.ERPSDB],
                    filterValues.ID_PGM || '',
                    filterValues.NM_KOR_PGM || '',
                    filterValues.MC_MENU || '',
                    filterValues.MC_PGM_TYPE || '',
                ],
                dataPath: 'rsData01'
            },
            save: {
                path: 'Bpa100n.ashx',
                funcNm: 'UfnSave',
                bParam: [window.top.gSInfo?.ERPSDB || '', '', '']
            },
            // syncForm: 그리드 포커스행 ↔ form 객체 양방향 동기화
            syncForm: {
                state: computed(() => form),
                columns: ['ID_PGM', 'NM_KOR_PGM', 'NM_ENG_PGM', 'YN_USE', 'BIGO']
            }
        });

        const toolBoxConfig = {
            left: ['append', 'delete'],
            right: ['save', 'excel']
        };

        // 초기화
        onMounted(async () => {
            await Ctv.setCombo(options, {
                MC_MENU: { CODE: 'B019', FLAG: '0-Y' },
                MC_AMD_TYPE: { CODE: 'B020', FLAG: '0' },
                MC_PGM_TYPE: { CODE: 'B017', FLAG: '0' },
                PGM_FOLDER: { CODE: 'B003', FLAG: '0' },
                YN_USE: { CODE: 'B031', FLAG: '0' },
                MC_MODL_TYPE: { CODE: 'B050', FLAG: '0' },
            });
            comboLoaded.value = true;
        });

        return {
            comboLoaded,
            options,
            filterFields,
            masterGrid,
            form,
            toolBoxConfig
        };
    };

    // ===== Vue App 초기화 =====
    const app = Vue.createApp({
        setup() {
            if (typeof window.onPageSetup === 'function') {
                return window.onPageSetup();
            }
            return {};
        }
    });

    if (window.Ctv && typeof window.Ctv.install === 'function') {
        app.use(window.Ctv);
    } else if (window.CtvUI && typeof window.CtvUI.install === 'function') {
        app.use(window.CtvUI);
    } else if (window.CtvUI && window.CtvUI.default && typeof window.CtvUI.default.install === 'function') {
        app.use(window.CtvUI.default);
    }

    app.mount('#app');

})();
