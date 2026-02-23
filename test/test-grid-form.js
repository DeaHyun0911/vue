
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

            query: {
                FG_SYS: '',
                NM_CODE: ''
            },

            filter: {
                columns: 3,
                target: 'group1',
                fields: [
                    {
                        field: "FG_SYS",
                        component: "ctv-select",
                        props: { title: "System Type", options: [] }
                    },
                    {
                        field: "NM_CODE",
                        component: "ctv-input",
                        props: { title: "Code Name" }
                    }
                ]
            },

            // Form Model - 그리드와 양방향 동기화됨
            formModel: {
                CD_MST: '',
                NM_CODE: '',
                FG_SYS: '',
                YN_USE: '',
                BIGO: ''
            },

            form: {
                columns: 2,
                labelWidth: '100px',
                labelPosition: 'top'
            },

            mainGrid: {
                id: 'grid1',
                group: 'group1',
                title: "Product List",
                editable: true,
                autoLoad: true,
                focusRow: null, // 나중에 formModel로 설정됨
                gridConfig: (gridState) => ({
                    columns: [
                        { field: 'CD_MST', caption: 'Product ID', colType: 'C|PK|STR', width: '100px', align: 'center', lockType: 'INSERT_ONLY' },
                        { field: 'NM_CODE', caption: 'Product Name', colType: 'L|STR', width: '200px' },
                        { field: 'FG_SYS', caption: 'Category', colType: 'C|STR', width: '100px', inputCombo: state.options.FG_SYS },
                        { field: 'YN_USE', caption: 'Active', colType: 'C|STR', width: '80px', inputCombo: state.options.YN_USE },
                        { field: 'BIGO', caption: 'Notes', colType: 'L|STR', width: '150px' }
                    ]
                }),
                query: {
                    path: "Test.ashx", funcNm: "UfnQueryCodeMaster", dataPath: 'rsData01'
                }
            }
        });


        state.mainGrid.focusRow = state.formModel;

        onMounted(async () => {
            await window.Ctv.setCombo(state.options, { FG_SYS: {}, YN_USE: {} });


            const sysField = state.filter.fields.find(f => f.field === 'FG_SYS');
            if (sysField) sysField.props.options = state.options.FG_SYS;
        });

        return { ...toRefs(state) };
    }
});

app.use(ElementPlus);
if (window.CtvUI && window.CtvUI.default) app.use(window.CtvUI.default);
else if (window.CtvUI) app.use(window.CtvUI);

app.mount('#app');
