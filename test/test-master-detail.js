
// test-master-detail.js

// 1. Mock Data Setup
window.Ctv = window.Ctv || {};

window.Ctv.setCombo = async (targetObj, definitions) => {
    // Dummy combo data
    const dummyCombos = {
        BS_GUBN: [{ value: 'B01', text: 'Business 1' }, { value: 'B02', text: 'Business 2' }],
        FG_SYS: [{ value: 'S01', text: 'System A' }, { value: 'S02', text: 'System B' }],
        YN_USE: [{ value: 'Y', text: 'Use' }, { value: 'N', text: 'Unused' }]
    };
    Object.keys(definitions).forEach(key => {
        if (targetObj[key] !== undefined) targetObj[key] = dummyCombos[key] || [];
    });
};

window.Ctv.dataQuery = async (options) => {
    await new Promise(r => setTimeout(r, 100)); // Simulate delay
    const { funcNm, bParam } = options;

    if (funcNm === "UfnQuery") {
        // Master Data
        return {
            rsData01: [
                { CD_MST: 'M-001', NM_CODE: 'Human Resources', FG_SYS: 'S01', YN_USE: 'Y', BIGO: 'Core HR Data' },
                { CD_MST: 'M-002', NM_CODE: 'Finance', FG_SYS: 'S02', YN_USE: 'Y', BIGO: 'Account Data' },
                { CD_MST: 'M-003', NM_CODE: 'Logistics', FG_SYS: 'S01', YN_USE: 'N', BIGO: 'Deprecated' },
            ]
        };
    } else if (funcNm === "UfnQueryDetail") {
        // Detail Data
        const masterCode = bParam && bParam[1] ? bParam[1] : '';
        const allDetails = [
            { CD_MST: 'M-001', CD_DTL: 'HR-01', NM_CODE: 'Employee Info', YN_USE: 'Y' },
            { CD_MST: 'M-001', CD_DTL: 'HR-02', NM_CODE: 'Payroll', YN_USE: 'Y' },
            { CD_MST: 'M-002', CD_DTL: 'FIN-01', NM_CODE: 'General Ledger', YN_USE: 'Y' },
            { CD_MST: 'M-002', CD_DTL: 'FIN-02', NM_CODE: 'Accounts Payable', YN_USE: 'Y' },
        ];
        return {
            rsData02: allDetails.filter(d => d.CD_MST === masterCode)
        };
    }
    return {};
};

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
                    path: "Test.ashx", funcNm: "UfnQuery", dataPath: 'rsData01'
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
                    path: "Test.ashx", funcNm: "UfnQueryDetail",
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
