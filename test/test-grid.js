(function () {
    const { ref, reactive, onMounted, computed } = window.Vue;

    // ===== Mock 설정 (mock-data.js 사용) =====
    // window.Ctv 및 Global setup은 mock-data.js에서 처리됨

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
                funcNm: 'UfnQueryProgram',
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
