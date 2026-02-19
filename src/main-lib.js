import * as Vue from 'vue';
import { createApp } from 'vue';
import ElementPlus, { ElMessageBox } from 'element-plus';
import 'element-plus/dist/index.css';
import { ko } from 'element-plus/es/locales.mjs';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import * as Components from './components/index.js';

// Global styles for custom components
import './assets/ctv-ui.css';

import * as Utils from './utils/common.js';
import componentRegistry from './utils/componentRegistry.js';

const install = (app) => {
    // Register Element Plus
    app.use(ElementPlus, { locale: ko });

    // Register Element Plus Icons
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component);
    }

    // Register all components globally
    for (const key in Components) { // Changed 'components' to 'Components' to use the imported object
        app.component(key, Components[key]);
    }
};

// Auto-install when vue is found (e.g. in browser via <script> tag)
/* 
if (typeof window !== 'undefined' && window.Vue) {
    install(window.Vue.createApp({})); // Logic might differ for global build usage
}
*/

const Ctv = {
    install,
    ...Utils,
    componentRegistry,
    get: (id) => componentRegistry.get(id)
};

if (typeof window !== 'undefined') {
    window.Ctv = Ctv;
    window.CtvUI = Ctv; // Legacy support

    // 콤보 데이터 로딩 훅 (Composable)
    Ctv.useCombo = (config) => {
        const { reactive, onMounted } = Vue;

        const data = reactive({});

        // 1. 초기 상태 설정
        for (const key in config) {
            data[key] = [];
        }

        // 2. 마운트 시 데이터 로드
        onMounted(() => {
            if (window.Ctv && typeof window.Ctv.setCombo === 'function') {
                window.Ctv.setCombo(data, config);
            } else {
                console.error("[Ctv.useCombo] Ctv.setCombo 함수를 찾을 수 없습니다.");
            }
        });

        return data;
    };

    // Vue Composition API 등을 전역으로 사용하여 const { ref } = Vue; 생략 가능하게 함
    Object.assign(window, Vue);

    // 전역 변경사항 확인 (탭 닫기 전 체크 등)
    window.ctvHasChanges = () => {
        const components = componentRegistry.getAll();
        let hasChange = false;
        for (const comp of components.values()) {
            // comp.hasChanges가 ref이면 .value, 아니면 그냥 값
            const isChanged = (comp.hasChanges && typeof comp.hasChanges === 'object' && 'value' in comp.hasChanges)
                ? comp.hasChanges.value
                : comp.hasChanges;
            if (isChanged) {
                hasChange = true;
                break;
            }
        }
        return hasChange;
    };

    // 전역 변경사항 저장 (페이지 내 모든 컴포넌트)
    window.ctvSaveAll = async (reload = true) => {
        const components = componentRegistry.getAll();
        let allSaved = true;

        for (const comp of components.values()) {
            // 변경사항 체크
            let isChanged = false;
            if (comp.hasChanges) {
                if (typeof comp.hasChanges === 'object' && 'value' in comp.hasChanges) {
                    isChanged = comp.hasChanges.value;
                } else {
                    isChanged = comp.hasChanges;
                }
            }

            if (isChanged && typeof comp.save === 'function') {
                try {
                    const result = await comp.save(reload);
                    if (!result || (result.ErrorCode && result.ErrorCode !== "")) {
                        allSaved = false;
                    }
                } catch (e) {
                    console.error("저장 실패:", e);
                    allSaved = false;
                }
            }
        }
        return allSaved;
    };

    // 전역 Alert (Promise)
    window.ctvAlert = (message, title = '알림', options = {}) => {
        return ElMessageBox.alert(message, title, {
            confirmButtonText: '확인',
            dangerouslyUseHTMLString: true,
            ...options
        });
    };

    // 전역 Confirm (Promise)
    window.ctvConfirm = (message, title = '확인', options = {}) => {
        return ElMessageBox.confirm(message, title, {
            confirmButtonText: '확인',
            cancelButtonText: '취소',
            dangerouslyUseHTMLString: true,
            ...options
        });
    };
}

export default Ctv;

// Also export components individually for tree-shaking if needed in other build setups
export * from './components/index.js';
export * from './utils/common.js';
