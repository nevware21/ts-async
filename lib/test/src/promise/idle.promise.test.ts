/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2024 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { createIdlePromise, setDefaultIdlePromiseTimeout } from "../../../src/promise/idlePromise";
import { getGlobal, setBypassLazyCache } from "@nevware21/ts-utils";
import { setPromiseDebugState } from "../../../src/promise/debug";

describe("createIdlePromise", () => {
    beforeEach(() => {
        setDefaultIdlePromiseTimeout();
        setBypassLazyCache(true);
    });

    afterEach(() => {
        setBypassLazyCache(false);
    });

    it("should create a new idle promise with timeout from parameter", async () => {
        let orgRequestIdleCallback: any = (getGlobal() as any).requestIdleCallback;
        if (orgRequestIdleCallback) {
            try {
                let theOptions: any;
                (getGlobal() as any).requestIdleCallback = (callback: any, options: any) => {
                    theOptions = options;
                    orgRequestIdleCallback(callback, options);
                };
                
                await createIdlePromise((resolve, reject) => {
                    resolve(void 0);
                }, 100).then(() => {
                    assert.isTrue(theOptions.timeout === 100);
                });

                await createIdlePromise((resolve, reject) => {
                    resolve(void 0);
                }, 50).then(() => {
                    assert.isTrue(theOptions.timeout === 50);
                });
            } finally {
                (getGlobal() as any).requestIdleCallback = orgRequestIdleCallback;
            }
        } else {
            assert.ok(true, "Test skipped, requestIdleCallback not supported");
        }
    });

    it("should create a new idle promise with timeout from default", async () => {
        let orgRequestIdleCallback: any = (getGlobal() as any).requestIdleCallback;
        if (orgRequestIdleCallback) {
            try {
                let theOptions: any;
                (getGlobal() as any).requestIdleCallback = (callback: any, options: any) => {
                    theOptions = options;
                    orgRequestIdleCallback(callback, options);
                };

                setDefaultIdlePromiseTimeout(99);
                await createIdlePromise((resolve, reject) => {
                    resolve(void 0);
                }).then(() => {
                    assert.isTrue(theOptions.timeout === 99);
                });

                setDefaultIdlePromiseTimeout(50);
                await createIdlePromise((resolve, reject) => {
                    resolve(void 0);
                }).then(() => {
                    assert.isTrue(theOptions.timeout === 50);
                });
            } finally {
                (getGlobal() as any).requestIdleCallback = orgRequestIdleCallback;
            }
        } else {
            assert.ok(true, "Test skipped, requestIdleCallback not supported");
        }
    });

    it("Check toString with no debug state", () => {
        setPromiseDebugState(false);
        let idlePromise = createIdlePromise((resolve, reject) => {
            resolve(void 0);
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise "), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" resolved"), idlePromise.toString());

        idlePromise = createIdlePromise((resolve, reject) => {
            reject(void 0);
        });
        
        idlePromise.catch(() => {
            // ignore (unhandled promise rejection)
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise "), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" rejected"), idlePromise.toString());

        idlePromise = createIdlePromise((resolve, reject) => {
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise "), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" pending"), idlePromise.toString());
    });

    it("Check toString with debug state", () => {
        setPromiseDebugState(true);
        let idlePromise = createIdlePromise((resolve, reject) => {
            resolve(void 0);
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise["), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" resolved"), idlePromise.toString());

        idlePromise = createIdlePromise((resolve, reject) => {
            reject(void 0);
        });

        idlePromise.catch(() => {
            // ignore (unhandled promise rejection)
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise["), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" rejected"), idlePromise.toString());

        idlePromise = createIdlePromise((resolve, reject) => {
        });

        assert.isTrue(idlePromise.toString().startsWith("IPromise["), idlePromise.toString());
        assert.isTrue(idlePromise.toString().includes(" pending"), idlePromise.toString());

        // return "IPromise" + (_promiseDebugEnabled ? "[" + _id + (!isUndefined(_parentId) ? (":" + _parentId) : "") + "]" : "") + " " + _strState() + (_hasResolved ? (" - " + dumpFnObj(_settledValue)) : "");

    });

});