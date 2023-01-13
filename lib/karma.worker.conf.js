process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function (config) {
    const typescript = require("@rollup/plugin-typescript");
    const plugin = require("@rollup/plugin-node-resolve");
    const commonjs = require("@rollup/plugin-commonjs");
    config.set({
        browsers: ["ChromeHeadless"],
        listenAddress: 'localhost',
        hostname: 'localhost',
        frameworks: [ "mocha-webworker" ],
        files: [
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
                commonjs()
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
                    "test/**/*.js"
                ]
            }
        },
        coverageIstanbulReporter: {
            "html-spa":  {
                "directory": "../coverage",
                "subdirectory": "worker"
            },
            "json": {
                "directory": "../coverage",
                "subdirectory": "worker",
                "filename": "coverage-final.json"
            },
            "text": ""
        },

        reporters: [ "spec", "coverage-istanbul" ],
        evaluate: {
            //beforeMochaImport: 'self.assert = require("assert")'
        },

        logLevel: config.LOG_DEBUG
    })
};