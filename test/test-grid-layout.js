
// test-grid-layout.js

// 1. Mock Data Setup (Before App Init)
window.Ctv = window.Ctv || {};

// Mock setCombo
window.Ctv.setCombo = async (targetObj, definitions) => {
    console.log("[Mock] setCombo called", definitions);
    // Simulate async network delay
    await new Promise(r => setTimeout(r, 100));

    // Dummy combo data
    const dummyCombos = {
        BS_GUBN: [
            { value: 'B014', text: '업무구분1' },
            { value: 'B015', text: '업무구분2' }
        ],
        FG_SYS: [
            { value: 'S01', text: '시스템1' },
            { value: 'S02', text: '시스템2' }
        ],
        YN_USE: [
            { value: 'Y', text: '사용' },
            { value: 'N', text: '미사용' }
        ]
    };

    Object.keys(definitions).forEach(key => {
        if (targetObj[key] !== undefined) {
            targetObj[key] = dummyCombos[key] || [];
        }
    });
};

// Mock dataQuery
window.Ctv.dataQuery = async (options) => {
    console.log("[Mock] dataQuery called", options);
    await new Promise(r => setTimeout(r, 300)); // Simulate delay

    const { funcNm, bParam } = options;

    if (funcNm === "UfnQuery") {
        // Return Master Data
        return {
            rsData01: [
                { CD_MST: 'M001', NM_CODE: '인사코드', FG_SYS: 'S01', LENG: '4', BIGO: '인사 관련 마스터', USE_YN: 'Y' },
                { CD_MST: 'M002', NM_CODE: '급여코드', FG_SYS: 'S02', LENG: '4', BIGO: '급여 관련 마스터', USE_YN: 'Y' },
                { CD_MST: 'M003', NM_CODE: '회계코드', FG_SYS: 'S01', LENG: '3', BIGO: '회계 관련 마스터', USE_YN: 'N' },
            ]
        };
    } else if (funcNm === "UfnQueryDetail") {
        // Return Detail Data (Simulate filtering by CD_MST from bParam if possible, or just return dummy)
        // bParam[1] is CD_MST usually based on Grid001n params
        const cdMst = bParam && bParam[1] ? bParam[1] : 'ALL';

        return {
            rsData02: [
                { CD_MST: cdMst, CD_DTL: 'D001', NM_CODE: '상세1', FG_SYS: 'S01', YN_USE: 'Y', BIGO: 'Detail 1' },
                { CD_MST: cdMst, CD_DTL: 'D002', NM_CODE: '상세2', FG_SYS: 'S01', YN_USE: 'Y', BIGO: 'Detail 2' },
                { CD_MST: cdMst, CD_DTL: 'D003', NM_CODE: '상세3', FG_SYS: 'S02', YN_USE: 'N', BIGO: 'Detail 3' },
            ]
        };
    }

    return {};
};

// 2. Vue App Setup
const { createApp, ref, reactive, toRefs, onMounted, computed, watch } = Vue;

const app = createApp({
    setup() {
        const state = reactive({
            // 콤보 데이터
            options: {
                BS_GUBN: [],
                FG_SYS: [],
                YN_USE: [],
            },

            formSetting: {
                title: "비고 (Form)",
                columns: 3,
                labelWidth: '100px'
            },

            toolBox: {
                left: ['append', 'delete'],
                right: ['save', 'excel'],
                target: 'group1'
            },

            // Master Grid (Left)
            masterGrid: {
                id: 'grid1',
                group: 'group1',
                title: "Master Grid",
                editable: true,
                autoLoad: true, // Auto load on start
                focusData: {}, // Initial empty object
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: '마스터', colType: 'C|PK|STR|M', width: '80px', align: 'center' },
                        { field: 'NM_CODE', caption: '마스터명', colType: 'L|NN|STR', width: '150px' },
                        { field: 'FG_SYS', caption: '시스템구분', colType: 'C|NN|STR', width: '100px', inputCombo: state.options.FG_SYS },
                        { field: 'LENG', caption: '길이', colType: 'C|NN|STR', width: '60px', align: 'right' },
                        { field: 'BIGO', caption: '비고', colType: 'L|STR', width: '200px' }
                    ],
                    doCommand: {
                        rowChange: (grid, row) => {
                            console.log("Master Row Changed", row);
                            // Trigger Detail Grid Query
                            // Using window.grid2 global or finding component by ID
                            const grid2 = window.grid2; // Assuming CtvDataGrid registers to window
                            if (grid2 && grid2.query) {
                                grid2.query();
                            }
                        }
                    }
                }),
                query: {
                    path: "Test.ashx",
                    funcNm: "UfnQuery",
                    dataPath: 'rsData01'
                }
            },

            // Detail Grid (Right Top)
            detailGrid: {
                id: 'grid2',
                group: 'group1',
                title: "Detail Grid",
                editable: true,
                autoLoad: false, // Wait for master selection
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: '마스터', colType: 'C|PK|STR', width: '80px', align: 'center' },
                        { field: 'CD_DTL', caption: '상세코드', colType: 'C|PK|STR', width: '80px', align: 'center' },
                        { field: 'NM_CODE', caption: '상세명', colType: 'L|NN|STR', width: '150px' },
                        { field: 'YN_USE', caption: '사용유무', colType: 'C|NN|STR', width: '80px', inputCombo: state.options.YN_USE },
                        { field: 'BIGO', caption: '비고', colType: 'L|STR', width: '150px' }
                    ]
                }),
                query: {
                    path: "Test.ashx",
                    funcNm: "UfnQueryDetail",
                    params: () => {
                        // Get selected master code safely
                        const masterCode = state.masterGrid.focusData?.CD_MST || '';
                        return ['', masterCode];
                    },
                    dataPath: 'rsData02'
                }
            }
        });

        onMounted(async () => {
            // Load Combos
            await window.Ctv.setCombo(state.options, {
                BS_GUBN: {}, FG_SYS: {}, YN_USE: {}
            });
        });

        return {
            ...toRefs(state)
        };
    }
});

// Register Components
app.use(ElementPlus);
// Assuming CtvUI registers itself if imported via global script (it does usually if window.Vue is present, but let's check)
// UMD build usually exposes CtvUI global.
// We need to verify if CtvUI auto-installs.
// If CtvUI is available globally, we can use app.use(CtvUI).
// The build output said: "Consumers of your bundle will have to use `CtvUI.default`"
// So:
// app.use(window.CtvUI.default || window.CtvUI);
// Let's defer mount until script loads.
// Or just rely on standard naming.

if (window.CtvUI) {
    if (window.CtvUI.default) {
        app.use(window.CtvUI.default);
    } else {
        app.use(window.CtvUI);
    }
} else {
    console.error("CtvUI library not loaded!");
}

app.mount('#app');
