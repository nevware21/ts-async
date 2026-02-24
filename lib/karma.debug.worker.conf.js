/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 *
 * Fast worker debug configuration using:
 * - karma-typescript for fast compilation
 * - Custom worker-test framework for worker execution
 * - Chrome with debugger (not headless)
 */

// Default to using edge locally -- choose your own browser as required
process.env.CHROME_BIN = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

module.exports = function (config) {
    config.set({
        browsers: [ "Chromium_without_security" ],
        listenAddress: "localhost",
        hostname: "localhost",

        // Use mocha + karma-typescript (same fast setup that works for browser)
        frameworks: [ "mocha", "karma-typescript" ],
        files: [
            { pattern: "src/**/*.ts" },
            { pattern: "../common/test/worker-adapter.js" },
            { pattern: "test/src/!(browser|esnext|node)/**/*.ts" },
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
                inlineSourceMap: true,
                inlineSources: true,
                module: "commonjs"
            },
            bundlerOptions: {
                sourceMap: false
            },
            coverageOptions: {
                instrumentation: false,
                sourceMap: true
            }
        },
        reporters: [ "spec" ],
        customLaunchers: {
            Chromium_without_security: {
                base: "Chrome",
                flags: [ "--disable-web-security", "--disable-site-isolation-trials", "--no-sandbox" ]
            }
        },
        logLevel: config.LOG_INFO,
        captureTimeout: 60000,
        browserNoActivityTimeout: 60000
    });
};
