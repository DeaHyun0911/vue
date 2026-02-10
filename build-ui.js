/**
 * build-ui.js
 * Bundles es-hangul + ctv-ui scripts into Program/cwwsCom/js/ctv-ui.js and ctv-ui.min.js.
 * Run: npm run build:ui
 */
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CTV_UI_DIR = path.join(ROOT, "ctv-ui");
const JS_DIR = path.join(ROOT, "js");

const CTV_UI_FILES = [
    "ctv-Component-Manager.js",
    "ctv-Component.js",
    "ctv-DataGrid.js",
    "ctv-DocViewer.js",
    "ctv-FreeForm.js",
    "ctv-Icons.js",
    "ctv-Page-Component.js",
    "ctv-Page-Utils.js",
    "ctv-QueryFilter.js",
    "ctv-Templates.js",
    "ctv-ToolBox.js",
];

async function build() {
    const shimPath = path.join(CTV_UI_DIR, "es-hangul-shim.js");
    const shimOut = path.join(JS_DIR, ".es-hangul-bundle.js");

    console.log("Bundling es-hangul...");
    await esbuild.build({
        entryPoints: [shimPath],
        bundle: true,
        format: "iife",
        outfile: shimOut,
        platform: "browser",
        minify: false,
    });

    let shimCode = fs.readFileSync(shimOut, "utf8");
    fs.unlinkSync(shimOut);

    const parts = [shimCode];
    for (const name of CTV_UI_FILES) {
        const filePath = path.join(CTV_UI_DIR, name);
        if (fs.existsSync(filePath)) {
            parts.push(fs.readFileSync(filePath, "utf8"));
        }
    }

    const full = parts.join("\n");
    const outJs = path.join(JS_DIR, "ctv-ui.js");
    fs.writeFileSync(outJs, full, "utf8");
    console.log("Wrote", outJs);

    console.log("Minifying ctv-ui.min.js...");
    await esbuild.build({
        entryPoints: [outJs],
        bundle: false,
        format: "iife",
        outfile: path.join(JS_DIR, "ctv-ui.min.js"),
        minify: true,
        platform: "browser",
    });
    console.log("Wrote", path.join(JS_DIR, "ctv-ui.min.js"));
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
