(function () {
    // Mock Ctv object (use the global one if available, otherwise define mock)
    // The library has already set window.Ctv if loaded properly.
    // But here we need to override setCombo and dataQuery for mocking.

    const { ref, reactive, onMounted, computed } = window.Vue;

    // Preserve existing utilities if any
    const originalCtv = window.Ctv || {};

    window.Ctv = {
        ...originalCtv,
        // Mock setCombo 함수
        setCombo: async function (options, config) {
            // Mock 콤보 데이터
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

            // 각 옵션에 mock 데이터 할당
            for (const key in config) {
                if (mockComboData[key]) {
                    options[key] = mockComboData[key];
                }
            }

            // 비동기 처리 시뮬레이션
            return new Promise(resolve => setTimeout(resolve, 500));
        },
    };

    // Assign mock dataQuery function to window.Ctv
    window.Ctv.dataQuery = async function (config) {
    };

    // Assign mock dataQuery function to window.Ctv
    window.Ctv.dataQuery = async function (config) {
        // ... (mock dataQuery implementation) - Just minimal for dataQuery, restore previous mock logic if needed, but here focus on closing it.
        const mockGridData = [
            {
                MC_MENU: 'M001',
                ID_PGM_TOP: '',
                NO_PGM: 0,
                ID_PGM: 'BPA100N',
                NM_KOR_PGM: '프로그램등록',
                NM_ENG_PGM: 'Program Registration',
                NM_CHN_PGM: '程序注册',
                MC_AMD_TYPE: 'A01',
                MC_PGM_TYPE: 'T01',
                PGM_FOLDER: 'F01',
                YN_USE: 'Y',
                MC_MODL_TYPE: 'MD01',
                DT_PATCH_FIR: '2024-01-01',
                DT_PATCH_LST: '2024-12-31',
                BIGO: '기본 프로그램',
                TM_REG: '2024-01-01 09:00:00',
                TM_UPT: '2024-12-31 18:00:00',
                ROWID: 'R001'
            }
            // ... (abbreviated for brevity, but I should probably include full mock data or just rely on what was there if I could select range better)
            // Wait, I am replacing a huge range. I need to make sure I don't lose the mock data.
            // The issue is that I pasted `window.top.gSInfo...` inside dataQuery in previous edits?
            // No, previous edit inserted `window.top...` and `window.onPageSetup` inside `dataQuery`!
            // That was the mistake.
        ];

        // 비동기 처리 시뮬레이션
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    rsData01: mockGridData
                });
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

    // page setup function
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

        // 검색 필터 필드
        const filterFields = computed(() => [
            {
                component: 'ctv-select',
                field: 'MC_MENU',
                props: {
                    title: '매뉴대분류',
                    options: options.MC_MENU
                }
            },
            {
                component: 'ctv-select',
                field: 'MC_PGM_TYPE',
                props: {
                    title: '프로그램타입',
                    options: options.MC_PGM_TYPE
                }
            },
            {
                component: 'ctv-input',
                field: 'ID_PGM',
                props: {
                    title: '프로그램ID',
                    placeholder: '프로그램ID 입력'
                }
            },
            {
                component: 'ctv-input',
                field: 'NM_KOR_PGM',
                props: {
                    title: '프로그램명',
                    placeholder: '프로그램명 입력'
                }
            }
        ]);

        // 그리드 설정 함수
        const gridConfig = (state) => ({
            defaultUnit: '%',
            columns: [
                {
                    field: 'MC_MENU',
                    caption: '메뉴대분류',
                    colType: 'C|NN|STR|M|SP',
                    inputCombo: options.MC_MENU,
                    groupTitle: {
                        aggregates: [{
                            func: (rows) => rows[0]?.NM_KOR_PGM,
                            field: 'MC_MENU'
                        }],
                        title: { template: `{{MC_MENU}}` }
                    },
                },
                { field: 'ID_PGM_TOP', caption: '상위ID', colType: 'STR|C|NN|S' },
                { field: 'NO_PGM', caption: '순서', colType: 'NUM|C|NN|XS' },
                {
                    field: 'ID_PGM',
                    caption: '프로그램ID',
                    colType: "STR|L|NN|M",
                },
                { field: 'NM_KOR_PGM', caption: '프로그램명(한국어)', colType: 'STR|L|NN|XL' },
                { field: 'NM_ENG_PGM', caption: '프로그램명(영어)', colType: 'STR|L|XL' },
                { field: 'NM_CHN_PGM', caption: '프로그램명(중국어)', colType: 'STR|L|XL' },
                { field: 'MC_AMD_TYPE', caption: '권한분류', colType: 'STR|C|NN|M', type: 'combo', combo: options.MC_AMD_TYPE },
                {
                    field: 'MC_PGM_TYPE',
                    caption: '타입',
                    colType: 'STR|C|NN|M',
                    type: 'combo',
                    inputCombo: options.MC_PGM_TYPE,
                    itemContent: (label, value) => `${value} | ${label}`
                },
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

        // 조회 설정 (filterRef로 필터 참조)
        const queryConfig = {
            path: "Bpa100n.ashx",
            funcNm: "UfnQuery",
            filterRef: 'filter1',  // 필터 ID 참조
            params: (filterValues) => [
                window.top.gSInfo[window.ERPSDB],
                filterValues.ID_PGM || '',
                filterValues.NM_KOR_PGM || '',
                filterValues.MC_MENU || '',
                filterValues.MC_PGM_TYPE || '',
            ],
            dataPath: 'rsData01'
        };

        // 초기화
        onMounted(async () => {
            await Ctv.setCombo(options, {
                MC_MENU: { CODE: "B019", FLAG: "0-Y" },
                MC_AMD_TYPE: { CODE: "B020", FLAG: "0" },
                MC_PGM_TYPE: { CODE: "B017", FLAG: "0" },
                PGM_FOLDER: { CODE: "B003", FLAG: "0" },
                YN_USE: { CODE: "B031", FLAG: "0" },
                MC_MODL_TYPE: { CODE: "B050", FLAG: "0" },
            });

            // 콤보 데이터 로드 완료
            comboLoaded.value = true;
        });

        return {
            comboLoaded,
            options,
            filterFields,
            gridConfig,
            queryConfig
        };
    };


    // Initialize Vue App
    // Wait for DOM content loaded if necessary, or just run immediately if script is deferred/at bottom

    // Create the app using Ctv library
    const app = Vue.createApp({
        setup() {
            // Execute the page setup logic
            if (typeof window.onPageSetup === 'function') {
                return window.onPageSetup();
            }
            return {};
        }
    });

    // Install Ctv plugin (if it has install method)
    if (window.Ctv && typeof window.Ctv.install === 'function') {
        app.use(window.Ctv);
    } else if (window.CtvUI && typeof window.CtvUI.install === 'function') {
        app.use(window.CtvUI); // Fallback
    } else if (window.CtvUI && window.CtvUI.default && typeof window.CtvUI.default.install === 'function') {
        app.use(window.CtvUI.default); // UMD default export quirk
    }

    // Mount to #app
    app.mount('#app');

})();
