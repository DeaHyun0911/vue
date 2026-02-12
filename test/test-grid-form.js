
// test-grid-form.js

// 1. Mock Data Setup
window.Ctv = window.Ctv || {};

window.Ctv.setCombo = async (targetObj, definitions) => {
    // Dummy combo data
    const dummyCombos = {
        FG_SYS: [{ value: 'S01', text: 'System A' }, { value: 'S02', text: 'System B' }],
        YN_USE: [{ value: 'Y', text: 'Use' }, { value: 'N', text: 'Unused' }]
    };
    Object.keys(definitions).forEach(key => {
        if (targetObj[key] !== undefined) targetObj[key] = dummyCombos[key] || [];
    });
};

window.Ctv.dataQuery = async (options) => {
    await new Promise(r => setTimeout(r, 100)); // Simulate delay
    const { funcNm } = options;

    if (funcNm === "UfnQuery") {
        return {
            rsData01: [
                { CD_MST: 'ITEM-001', NM_CODE: 'Desktop PC', FG_SYS: 'S01', YN_USE: 'Y', BIGO: 'High performance setup' },
                { CD_MST: 'ITEM-002', NM_CODE: 'Laptop', FG_SYS: 'S02', YN_USE: 'Y', BIGO: 'Portable work station' },
                { CD_MST: 'ITEM-003', NM_CODE: 'Monitor', FG_SYS: 'S01', YN_USE: 'Y', BIGO: '4K Display' },
                { CD_MST: 'ITEM-004', NM_CODE: 'Keyboard', FG_SYS: 'S01', YN_USE: 'N', BIGO: 'Mechanical' },
            ]
        };
    }
    return {};
};

// 2. Vue App
const { createApp, reactive, toRefs, onMounted } = Vue;

const app = createApp({
    setup() {
        const state = reactive({
            options: { FG_SYS: [], YN_USE: [] },

            toolBox: {
                left: ['append', 'delete'],
                right: ['save', 'excel'],
                target: 'group1'
            },

            formSetting: {
                title: "Item Details",
                columns: 2,
                labelWidth: '100px'
            },

            mainGrid: {
                id: 'grid1',
                group: 'group1',
                title: "Product List",
                editable: true,
                autoLoad: true,
                focusData: {}, // Two-way binding target
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: 'Product ID', colType: 'C|PK|STR', width: '100px', align: 'center' },
                        { field: 'NM_CODE', caption: 'Product Name', colType: 'L|STR', width: '200px' },
                        { field: 'FG_SYS', caption: 'Category', colType: 'C|STR', width: '100px', inputCombo: state.options.FG_SYS },
                        { field: 'YN_USE', caption: 'Active', colType: 'C|STR', width: '80px', inputCombo: state.options.YN_USE },
                        { field: 'BIGO', caption: 'Notes', colType: 'L|STR', width: '150px' }
                    ],
                    // No explicit rowChange needed for form sync, handled internally by CtvDataGrid via focusData binding
                }),
                query: {
                    path: "Test.ashx", funcNm: "UfnQuery", dataPath: 'rsData01'
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
