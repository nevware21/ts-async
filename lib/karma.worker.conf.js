process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function (config) {
    const typescript = require("@rollup/plugin-typescript");
    const plugin = require("@rollup/plugin-node-resolve");
    const commonjs = require("@rollup/plugin-commonjs");
    const istanbul = require("rollup-plugin-istanbul");
    config.set({
        browsers: [ "ChromeHeadless" ],
        listenAddress: 'localhost',
        hostname: 'localhost',
        frameworks: [ "mocha-webworker" ],
        files: [
            { pattern: "src/**/*.ts", included: false },
            { pattern: "test/src/**/*.ts", included: false }
        ],
        preprocessors: {
            "**/*.ts": [ "rollup" ]
        },
        rollupPreprocessor: {
            plugins: [
                typescript({
                    tsconfig: "./test/tsconfig.worker.karma.json"
                }),
                plugin.nodeResolve({
                    browser: true
                }),
                commonjs(),
                istanbul({
                    exclude: [ "**/test/**", "**/node_modules/**" ]
                })
            ],
            output: {
                format: "iife",
                dir: "../test-dist",
                sourcemap: true
            }
        },
        client: {
            mochaWebWorker: {
                pattern: [
                    "test/src/**/*.js",
                ]
            }
        },
        coverageReporter: {
            dir: "../coverage/worker",
            includeAllSources: true,
            reporters: [
                { type: "text" },
                { type: "html", subdir: "html" },
                { type: "json", subdir: "./", file: "coverage-final.json" }
            ],
        },
        reporters: ["spec", "coverage" ],

        logLevel: config.LOG_DEBUG
    })
};