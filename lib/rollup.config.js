import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import cleanup from 'rollup-plugin-cleanup';
import minify from "rollup-plugin-minify-es";
import sourcemaps from 'rollup-plugin-sourcemaps';

const UglifyJs = require('uglify-js');

const version = require("./package.json").version;
const outputName = "ts-async";
const polyFillOutputName = "ts-polyfills-async";
const banner = [
    "/*!",
    ` * NevWare21 Solutions LLC - ts-async, ${version}`,
    " * https://github.com/nevware21/ts-async",
    " * Copyright (c) NevWare21 Solutions LLC and contributors. All rights reserved.",
    " * Licensed under the MIT license.",
    " */"
].join("\n");

const polyFillBanner = [
    "/*!",
    ` * NevWare21 Solutions LLC - ts-async Polyfills, ${version}`,
    " * https://github.com/nevware21/ts-async",
    " * Copyright (c) NevWare21 Solutions LLC and contributors. All rights reserved.",
    " * Licensed under the MIT license.",
    " */"
].join("\n");

function isSourceMapEnabled(options) {
    if (options) {
        return options.sourceMap !== false && options.sourcemap !== false;
    }

    return false;
}

function _doMinify(code, filename, options, chunkOptions) {
    var theCode = {};
    theCode[filename] = code;

    let theOptions = Object.assign({}, options);
    if (theOptions.hasOwnProperty("sourcemap")) {
        delete theOptions.sourcemap;
    }

    if (isSourceMapEnabled(options)) {
        theOptions.sourceMap = {
            filename: filename
        };
        if (filename) {
            theOptions.sourceMap.url = filename + ".map";
        }
    }

    var result = UglifyJs.minify(theCode, theOptions);

    if (result.error) {
        throw new Error(JSON.stringify(result.error));
    }

    var transform = {
        code: result.code
    };

    if (isSourceMapEnabled(options) && result.map) {
        transform.map = result.map;
    }

    return transform;
}

export function uglify3(options = {}) {

    return {
        name: "internal-rollup-uglify-js",
        renderChunk(code, chunk, chkOpt) {
            return _doMinify(code, chunk.filename, options, chkOpt);
        }
    }
}

function sourcemapTransformer(options) {
    let githubRawUrl = "https://raw.githubusercontent.com/nevware21/ts-async/refs/tags/" + version + "/";

    return (relativePath, sourceMapPath) => {
        let normalizePath = relativePath.replace(/\\/g, "/");
        let httpIdx = normalizePath.indexOf("https:/");
        if (httpIdx != -1) {
            // Reuse existing URL
            let url = relativePath.substring(httpIdx + 7);
            if (url.startsWith("/")) {
                url = url.substring(1);
            }

            return "https://" + url;
        }

        let srcPath = normalizePath.replace(/\.\.\//g, "");
        if (srcPath.startsWith("src/")) {
            return githubRawUrl + "lib/" + srcPath;
        }

        return relativePath;
    };
}

const rollupConfigFactory = (srcPath, destPath, isMinified, path, format = "iife", postfix = "") => {
    let mainFields = [ "module", "main" ];
    if (destPath === "es6") {
        mainFields = [ "esnext", "module", "main" ];
    }

    const taskRollupConfig = {
        input: `./${srcPath}/index.js`,
        output: {
            file: `./${destPath}/${path}/${outputName}${postfix}.js`,
            banner: banner,
            format: format,
            name: "nevware21.ts-async",
            freeze: false,
            sourcemap: true,
            sourcemapPathTransform: sourcemapTransformer(),
            exports: "named",
        },
        external: [ "fs", "path" ],
        plugins: [
            sourcemaps(),
            nodeResolve({
                module: true,
                browser: false,
                preferBuiltins: true,
                mainFields: mainFields
            }),
            commonjs(),
            cleanup({
                comments: [
                    /[#@]__/,
                    /^!/
                ]
            })
        ]
    };

    if (isMinified) {
        taskRollupConfig.output.file = `./${destPath}/${path}/${outputName}${postfix}.min.js`;
        if (format !== "esm") {
            taskRollupConfig.plugins.push(
                uglify3({
                    ie8: false,
                    toplevel: true,
                    compress: {
                        passes:3,
                        unsafe: true
                    },
                    output: {
                        preamble: banner,
                        webkit:true
                    }
                })
            );
        } else {
            taskRollupConfig.plugins.push(
                minify({
                    ie8: false,
                    toplevel: true,
                    compress: {
                        passes:3,
                        unsafe: true
                    },
                    output: {
                        preamble: banner,
                        webkit:true
                    }
                })
            );
        }
    }

    return taskRollupConfig;
};

const rollupConfigMainEntry = (srcPath, destPath, path, format = "umd") => {
    let mainFields = [ "module", "main" ];
    if (destPath === "es6") {
        mainFields = [ "esnext", "module", "main" ];
    }

    const taskRollupConfig = {
        input: `./${srcPath}/index.js`,
        output: {
            file: `./${destPath}/${path}/${outputName}.js`,
            banner: banner,
            format: format,
            name: "nevware21.ts-async",
            freeze: false,
            sourcemap: true,
            sourcemapPathTransform: sourcemapTransformer(),
            exports: "named",
            globals: {
                "@nevware21/ts-utils": "nevware21.ts-utils"
            }
        },
        external: [ "fs", "path", "@nevware21/ts-utils" ],
        plugins: [
            sourcemaps(),
            cleanup({
                comments: [
                    /[#@]__/,
                    /^!/,
                    "some",
                    "ts"
                ]
            })
        ]
    };

    return taskRollupConfig;
};

const polyfillRollupConfigFactory = (srcPath, destPath, isMinified, format = "iife", postfix = "") => {
    const taskRollupConfig = {
        input: `./${srcPath}/polyfills.js`,
        output: {
            file: `./${destPath}/${polyFillOutputName}${postfix}.js`,
            banner: polyFillBanner,
            format: format,
            name: "nevware21.ts-async",
            freeze: false,
            sourcemap: true,
            sourcemapPathTransform: sourcemapTransformer(),
            exports: "named",
        },
        external: [ "fs", "path" ],
        plugins: [
            sourcemaps(),
            nodeResolve({
                module: true,
                browser: false,
                preferBuiltins: true
            }),
            commonjs(),
            cleanup({
                comments: [
                    /[#@]__/,
                    /^!/
                ]
            })
        ]
    };

    if (isMinified) {
        taskRollupConfig.output.file = `./${destPath}/${polyFillOutputName}${postfix}.min.js`;
        taskRollupConfig.plugins.push(
            uglify3({
                ie8: false,
                toplevel: true,
                compress: {
                    passes:3,
                    unsafe: true
                },
                output: {
                    preamble: banner,
                    webkit:true
                }
            })
        );
    }

    return taskRollupConfig;
};

export default [
    polyfillRollupConfigFactory("build/es5/mod", "bundle/es5", true),
    polyfillRollupConfigFactory("build/es5/mod", "bundle/es5", false),

    rollupConfigMainEntry("build/es5/mod", "dist/es5", "main", "umd"),
    rollupConfigMainEntry("build/es6/mod", "dist/es6", "main", "umd"),
    rollupConfigMainEntry("build/es5/mod", "dist/es5", "mod", "es"),
    rollupConfigMainEntry("build/es6/mod", "dist/es6", "mod", "es"),

    // Self contained bundles (Used for testing -- will be removed in a future release)
    rollupConfigFactory("build/es5/mod", "dist/es5", false, "umd", "umd"),

    // ES5 Bundles
    rollupConfigFactory("build/es5/mod", "bundle/es5", false, "iife", "iife"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", true, "iife", "iife"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", false, "umd", "umd"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", true, "umd", "umd"),

    // ES6 Bundles
    rollupConfigFactory("build/es6/mod", "bundle/es6", false, "iife", "iife"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", true, "iife", "iife"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", false, "umd", "umd"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", true, "umd", "umd")
];
