/*
 * ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                "Gruntfile.js",
                "<%= nodeunit.tests %>"
            ],
            options: {
                jshintrc: ".jshintrc"
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ["tmp"]
        },

        // Unit tests.
        nodeunit: {
            tests: ["test/*_test.js"]
        },
        ts: {
            options: {
                debug: true,
                logOutput: true
            },
            "ts_async": {
                // Default ES5
                tsconfig: "./lib/tsconfig.json",
                outDir: "./lib/build/es5/mod"
            },
            "ts_async_es6": {
                tsconfig: "./lib/tsconfig.es6.json",
                outDir: "./lib/build/es6/mod"
            },
            "ts_async-test": {
                tsconfig: "./lib/test/tsconfig.test.json",
                outDir: "./lib/test-esm"
            }
        },
        "lint": {
            options: {
                format: "codeframe",
                suppressWarnings: false
            },
            "ts_async": {
                tsconfig: "./lib/tsconfig.json",
                ignoreFailures: true
            },
            "ts_async-test": {
                tsconfig: "./lib/test/tsconfig.test.json",
                ignoreFailures: true
            },
            "ts_async-fix": {
                options: {
                    tsconfig: "./lib/tsconfig.json",
                    fix: true
                }
            },
            "ts_async-test-fix": {
                options: {
                    tsconfig: "./lib/test/tsconfig.test.json",
                    fix: true
                }
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadNpmTasks("@nevware21/grunt-ts-plugin");
    grunt.loadNpmTasks("@nevware21/grunt-eslint-ts");

    grunt.registerTask("rollupuglify", ["ts:rollupuglify" ]);
    grunt.registerTask("ts_async", [ "lint:ts_async-fix", "lint:ts_async-test-fix", "ts:ts_async", "ts:ts_async_es6", "ts:ts_async-test" ]);
    grunt.registerTask("ts_async-test", [ "lint:ts_async-test-fix", "ts:ts_async-test" ]);
    grunt.registerTask("ts_async-lint", [ "lint:ts_async-fix", "lint:ts_async-test-fix" ]);
    grunt.registerTask("dolint", [ "lint:ts_async", "lint:ts_async-test" ]);
    grunt.registerTask("lint-fix", [ "lint:ts_async-fix", "lint:ts_async-test-fix" ]);
    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    // grunt.registerTask('ts_async_test', ['clean', 'ts_async']);

    // By default, lint and run all tests.
    grunt.registerTask("default", ["jshint" ]);
};
