import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import * as Components from './components/index.js';

// Global styles for custom components
import './assets/ctv-ui.css';

import * as Utils from './utils/common.js';
import componentRegistry from './utils/componentRegistry.js';

const install = (app) => {
    // Register Element Plus
    app.use(ElementPlus);

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
}

export default Ctv;

// Also export components individually for tree-shaking if needed in other build setups
export * from './components/index.js';
export * from './utils/common.js';
