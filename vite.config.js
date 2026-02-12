import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        {
            name: 'copy-build-files',
            closeBundle() {

                const distDir = resolve(__dirname, 'dist');
                const targetCssDir = resolve(__dirname, '../css');
                const targetJsDir = resolve(__dirname, '../js');

                // Ensure source files exist
                const cssFile = resolve(distDir, 'cwws-com-ui.css');
                const jsFile = resolve(distDir, 'ctv-ui.umd.js');

                // Copy CSS if destination exists
                if (fs.existsSync(targetCssDir) && fs.existsSync(cssFile)) {
                    fs.copyFileSync(cssFile, resolve(targetCssDir, 'ctv-ui.css'));
                    console.log(`Copied ${cssFile} to ${resolve(targetCssDir, 'ctv-ui.css')}`);
                }

                // Copy JS if destination exists
                if (fs.existsSync(targetJsDir) && fs.existsSync(jsFile)) {
                    fs.copyFileSync(jsFile, resolve(targetJsDir, 'ctv-ui.js'));
                    console.log(`Copied ${jsFile} to ${resolve(targetJsDir, 'ctv-ui.js')}`);
                }
            }
        }
    ],
    // Build as a library
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main-lib.js'),
            name: 'CtvUI',
            fileName: (format) => `ctv-ui.${format}.js`
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['vue'],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    vue: 'Vue'
                }
            }
        },
        outDir: 'dist',
        emptyOutDir: true
    },
    define: {
        'process.env.NODE_ENV': '"production"',
        'process.env': {}
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
})
