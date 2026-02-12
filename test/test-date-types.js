
// test-date-types.js

// 1. Mock Data Setup (from mock-data.js)
// window.Ctv and MockData are already loaded

// 2. Vue App
const { createApp, reactive, toRefs, onMounted, computed } = Vue;

const app = createApp({
    setup() {
        const state = reactive({
            // 콤보 데이터 (Optional)
            options: {},

            // 툴박스
            toolBox: {
                left: ['append', 'delete'],
                right: ['save', 'excel'],
                target: 'grid1'
            },

            // 조회 조건 (다양한 날짜 타입 테스트)
            query: {
                DATE_VAL: '2024-01-01',
                MONTH_VAL: '2024-01',
                YEAR_VAL: '2024',
                DATE_RANGE: ['2024-01-01', '2024-01-15'],
                MONTH_RANGE: ['2024-01', '2024-03']
            },

            // 필터 설정
            filter: {
                columns: 3,
                target: 'grid1',
                fields: [
                    {
                        field: "DATE_VAL",
                        component: "ctv-date",
                        props: { title: "Date (Default)", type: "date" }
                    },
                    {
                        field: "MONTH_VAL",
                        component: "ctv-date",
                        props: { title: "Month", type: "month" }
                    },
                    {
                        field: "YEAR_VAL",
                        component: "ctv-date",
                        props: { title: "Year", type: "year" }
                    },
                    {
                        field: "DATE_RANGE",
                        component: "ctv-date",
                        props: { title: "Date Range", type: "daterange", startPlaceholder: "Start", endPlaceholder: "End" },
                    },
                    {
                        field: "MONTH_RANGE",
                        component: "ctv-date",
                        props: { title: "Month Range", type: "monthrange", startPlaceholder: "S-Month", endPlaceholder: "E-Month" },
                    }
                ]
            },

            // 그리드 설정
            mainGrid: {
                id: 'grid1',
                title: "Date Types Grid",
                editable: true,
                autoLoad: true,
                focusData: {}, // Form sync target
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'ROW_ID', caption: 'ID', colType: 'C|PK|STR', width: '60px', align: 'center' },
                        { field: 'DATE_COL', caption: 'Date Type', colType: 'L|STR', width: '120px', align: 'center' },
                        { field: 'MONTH_COL', caption: 'Month Type', colType: 'L|STR', width: '100px', align: 'center' },
                        { field: 'YEAR_COL', caption: 'Year Type', colType: 'L|STR', width: '80px', align: 'center' },
                        { field: 'RANGE_START', caption: 'Range Start', colType: 'L|STR', width: '120px', align: 'center' },
                        { field: 'RANGE_END', caption: 'Range End', colType: 'L|STR', width: '120px', align: 'center' },
                    ]
                }),
                query: {
                    // Mock query function to return data based on date params
                    funcNm: "UfnQueryDateTypes",
                    dataPath: "rsData01"
                }
            },

            // 폼 설정 (상세 정보)
            form: {
                columns: 2,
                labelWidth: '120px'
            }
        });

        // Initialize Mock Data Specific for this test (if not already present or needs override)
        if (!window.MockData.dateTypesData) {
            window.MockData.dateTypesData = [
                { ROW_ID: '1', DATE_COL: '2024-01-01', MONTH_COL: '2024-01', YEAR_COL: '2024', RANGE_START: '2024-01-01', RANGE_END: '2024-01-31' },
                { ROW_ID: '2', DATE_COL: '2024-02-15', MONTH_COL: '2024-02', YEAR_COL: '2024', RANGE_START: '2024-02-01', RANGE_END: '2024-02-28' },
                { ROW_ID: '3', DATE_COL: '2024-03-30', MONTH_COL: '2024-03', YEAR_COL: '2024', RANGE_START: '2024-03-01', RANGE_END: '2024-03-31' },
                { ROW_ID: '4', DATE_COL: '2023-12-25', MONTH_COL: '2023-12', YEAR_COL: '2023', RANGE_START: '2023-12-01', RANGE_END: '2023-12-31' },
            ];
        }

        onMounted(() => {
            // Override window.Ctv.dataQuery only for this specific functional query
            // We need to be careful not to break other pages if this script is loaded globally, 
            // but since it's a standalone test page, it's fine.
            const originalDataQuery = window.Ctv.dataQuery;
            window.Ctv.dataQuery = async (options) => {
                if (options.funcNm === "UfnQueryDateTypes") {
                    await new Promise(r => setTimeout(r, 200));
                    return { rsData01: JSON.parse(JSON.stringify(window.MockData.dateTypesData)) };
                }
                return originalDataQuery(options);
            };
        });

        return { ...toRefs(state) };
    }
});

app.use(ElementPlus);
if (window.CtvUI && window.CtvUI.default) app.use(window.CtvUI.default);
else if (window.CtvUI) app.use(window.CtvUI);

app.mount('#app');
