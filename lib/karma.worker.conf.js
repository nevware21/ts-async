process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
    config.set({
        browsers: [ "ChromeHeadlessNoSandbox" ],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: "ChromeHeadless",
                flags: [ "--disable-web-security", "--disable-site-isolation-trials", "--no-sandbox" ]
            }
        },
        listenAddress: "localhost",
        hostname: "localhost",

        // Use mocha + karma-typescript (same fast setup that works for browser)
        frameworks: [ "mocha", "karma-typescript" ],
        files: [
            { pattern: "src/**/*.ts" },
            { pattern: "../common/test/worker-adapter.js" },
            { pattern: "test/src/!(browser|node)/**/*.ts" },
            { pattern: "../common/test/worker-test-runner.js", included: false, served: true, watched: false }
        ],
        preprocessors: {
            "src/**/*.ts": [ "karma-typescript" ],
            "test/src/**/*.ts": [ "karma-typescript" ]
        },
        karmaTypescriptConfig: {
            tsconfig: "./test/tsconfig.worker.karma.json",
            compilerOptions: {
                sourceMap: false,
                inlineSourceMap: false,
                inlineSources: false,
                module: "commonjs"
            },
            bundlerOptions: {
                sourceMap: false
            },
            coverageOptions: {
                instrumentation: true,
                exclude: [
                    /\.(d|spec|test)\.ts$/i,
                    /index\.ts$/i,
                    /checkError\.ts$/i,
                    /\/node_modules\//i
                ]
            },
            reports: {
                "html": {
                    "directory": "../coverage/worker",
                    "subdirectory": "./html"
                },
                "json": {
                    "directory": "../coverage/worker",
                    "subdirectory": "./",
                    "filename": "coverage-final.json"
                },
                "text": ""
            }
        },
        reporters: [ "spec", "karma-typescript" ],
        logLevel: config.LOG_INFO,
        captureTimeout: 60000,
        browserNoActivityTimeout: 60000
    });
};
