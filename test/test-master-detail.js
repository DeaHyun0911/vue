
// test-master-detail.js

// 1. Mock Data is loaded from mock-data.js

// 2. Vue App
const { createApp, reactive, toRefs, onMounted } = Vue;

const app = createApp({
    setup() {
        const state = reactive({
            options: { BS_GUBN: [], FG_SYS: [], YN_USE: [] },

            toolBox: {
                left: ['append', 'delete'],
                right: ['save', 'excel'],
                target: 'group1'
            },

            masterGrid: {
                id: 'grid1',
                group: 'group1',
                title: "Master Code List",
                editable: true,
                autoLoad: true,
                focusData: {},
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: 'Master Code', colType: 'C|PK|STR', width: '100px', align: 'center' },
                        { field: 'NM_CODE', caption: 'Name', colType: 'L|STR', width: '200px' },
                        { field: 'FG_SYS', caption: 'System', colType: 'C|STR', width: '100px', inputCombo: state.options.FG_SYS },
                        { field: 'YN_USE', caption: 'Use', colType: 'C|STR', width: '80px' }
                    ],
                    doCommand: {
                        rowChange: (grid, row) => {
                            // Trigger Detail Grid Query
                            const grid2 = window.grid2;
                            if (grid2 && grid2.query) grid2.query();
                        }
                    }
                }),
                query: {
                    path: "Test.ashx", funcNm: "UfnQueryCodeMaster", dataPath: 'rsData01'
                }
            },

            detailGrid: {
                id: 'grid2',
                group: 'group1',
                title: "Detail Code List",
                editable: true,
                autoLoad: false,
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: 'Master Ref', colType: 'C|PK|STR', width: '100px', align: 'center' },
                        { field: 'CD_DTL', caption: 'Detail Code', colType: 'C|PK|STR', width: '100px', align: 'center' },
                        { field: 'NM_CODE', caption: 'Detail Name', colType: 'L|STR', width: '200px' },
                        { field: 'YN_USE', caption: 'Use', colType: 'C|STR', width: '80px', inputCombo: state.options.YN_USE },
                    ]
                }),
                query: {
                    path: "Test.ashx", funcNm: "UfnQueryCodeDetail",
                    params: () => ['', state.masterGrid.focusData?.CD_MST || ''],
                    dataPath: 'rsData02'
                }
            }
        });

        onMounted(async () => {
            await window.Ctv.setCombo(state.options, { FG_SYS: {}, YN_USE: {} });
        });

        return { ...toRefs(state) };
    }
});

app.use(ElementPlus);
if (window.CtvUI && window.CtvUI.default) app.use(window.CtvUI.default);
else if (window.CtvUI) app.use(window.CtvUI);

app.mount('#app');
