/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import * as sinon from "sinon";
import { assert } from "chai";
import { arrForEach, dumpObj, getGlobal, isNode, isWebWorker, objHasOwn, scheduleTimeout, setBypassLazyCache } from "@nevware21/ts-utils";
import { createAsyncPromise, createAsyncRejectedPromise } from "../../../src/promise/asyncPromise";
import { IPromise } from "../../../src/promise/interfaces/IPromise";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { PolyPromise } from "../../../src/polyfills/promise";
import { createSyncRejectedPromise } from "../../../src/promise/syncPromise";
import { createIdleRejectedPromise } from "../../../src/promise/idlePromise";
import { createNativeRejectedPromise } from "../../../src/promise/nativePromise";
import { objForEachKey } from "@nevware21/ts-utils";

let _unhandledEvents: any[] = [];
function _unhandledrejection(event: any) {
    let prefix = "";
    if (arguments.length > 1) {
        prefix = arguments[1].toString() + " :: ";
    }

    _unhandledEvents.push(prefix + dumpObj(event));
    //console.log("Unhandled Rejection received: " + prefix + dumpObj(event));
}

function _unhandledNodeRejection(reason: any, promise: any) {
    let found = false;
    // The combination of node and mocha seems to cause any process.emit events to get duplicated (emitted twice)
    arrForEach(_unhandledEvents, (evt) => {
        if (evt.promise === promise) {
            found = true;
            return -1;
        }
    });

    if (!found) {
        // let prefix = promise.toString() + " :: ";
        _unhandledEvents.push({
            reason,
            promise
        });
        //console.log("Unhandled Node Rejection received: " + prefix + dumpObj(reason));
    }
}

interface TestDefinition {
    rejected: <T>(reason: any) => IPromise<T>;
    checkState: boolean;
    checkChainedState: boolean;
}

type TestImplementations = { [key: string]: TestDefinition };

let testImplementations: TestImplementations = {
    "system": {
        rejected: Promise.reject.bind(Promise),
        checkState: false,
        checkChainedState: false
    },
    "native": {
        rejected: createNativeRejectedPromise,
        checkState: false,
        checkChainedState: false
    },
    "async": {
        rejected: createAsyncRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "idle": {
        rejected: createIdleRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "sync": {
        rejected: createSyncRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "polyfill": {
        rejected: PolyPromise.reject,
        checkState: true,
        checkChainedState: true
    }
}

describe("Validate unhandled rejection event handling", () => {
    objForEachKey(testImplementations, (testKey, definition) => {
        describe(`Testing [${testKey}] promise implementation`, function () {
            if (testKey === "idle") {
                // Extend the default timeout for idle tests
                this.timeout(10000);
            }
    
            batchTests(testKey, definition);
        });
    });
});

async function waitForUnhandledRejection() {
    // Wait for unhandled rejection event
    await createAsyncPromise((resolve) => {
        let attempt = 0;
        let waiting = scheduleTimeout(() => {
            if (_unhandledEvents.length > 0) {
                resolve(true);
            } else if (attempt < 10) {
                attempt++;
                waiting.refresh();
            } else {
                throw "Failed to trigger and handle the unhandledRejection";
            }
        }, 50);
    });
}

function batchTests(testKey: string, definition: TestDefinition) {

    let createRejectedPromise = definition.rejected;
    let checkState = definition.checkState;
    let checkChainedState = definition.checkChainedState;

    beforeEach(() => {
        // clock = sinon.useFakeTimers();
        _unhandledEvents = [];

        function _debug(id: string, message: string) {
            //console && console.log && console.log("!!Debug[" + id + "]:" + message);
        }

        setPromiseDebugState(true, _debug);
        
        // Disable lazy caching
        setBypassLazyCache(true);

        if (!isNode()) {
            let gbl = getGlobal();
            if (gbl && (objHasOwn(gbl, "onunhandledrejection") || isWebWorker())) {
                gbl.addEventListener("unhandledrejection", _unhandledrejection);
            }
        } else {
            //EventEmitter.captureRejections = false;
            console.log("Adding Node Rejection Listener");
            process.on("unhandledRejection", _unhandledNodeRejection);
        }
    });

    afterEach(() => {
        if (!isNode()) {
            let gbl = getGlobal();
            if (gbl && (objHasOwn(gbl, "onunhandledrejection") || isWebWorker())) {
                gbl.removeEventListener("unhandledrejection", _unhandledrejection);
            }
        } else {
            console.log("Removing Node Rejection Listener");
            process.off("unhandledRejection", _unhandledNodeRejection);
        }
        
        // Re-Ensable lazy caching
        setBypassLazyCache(false);
    });

    it("Test pre-rejected promise with no handler", async () => {
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise"));
        if (checkState) {
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");
        }

        await waitForUnhandledRejection();
        assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
    });

    it("Test pre-rejected promise with with only a resolved handler", async () => {

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise"));
        if (checkState) {
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");
        }

        let resolvedCalled = false;
        let handled = preRejected.then(() => {
            resolvedCalled = true;
        });

        if (checkChainedState) {
            assert.equal(handled.state, testKey !== "sync" ? "pending" : "rejected", "The handling promise should be pending");
        }

        assert.equal(resolvedCalled, false, "Resolved handler should not have been called");

        await waitForUnhandledRejection();
        assert.equal(resolvedCalled, false, "Resolved handler should not have been called");
        if (checkChainedState) {
            assert.equal(handled.state, "rejected", "The handling promise should be rejected");
        }

        assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
    });

    it("Test pre-rejected promise with with only a reject handler", async () => {

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise"));
        if (checkState) {
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");
        }

        let catchCalled = false;
        let handled = preRejected.catch(() => {
            catchCalled = true;
        });

        if (checkChainedState) {
            assert.equal(handled.state, testKey !== "sync" ? "pending" : "resolved", "The handling promise should be pending");
        }

        assert.equal(catchCalled, testKey !== "sync" ? false : true, "Catch handler should not have been called");

        await handled;
        assert.equal(catchCalled, true, "Catch handler should have been called");
        if (checkChainedState) {
            assert.equal(handled.state, "resolved", "The handling promise should be resolved");
        }

        assert.equal(_unhandledEvents.length, 0, "Unhandled rejection should have been emitted");
    });

    it("Test pre-rejected promise with with only a finally handler", async () => {

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise"));
        if (checkState) {
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");
        }

        let finallyCalled = false;
        let handled = preRejected.finally(() => {
            finallyCalled = true;
        });

        if (checkChainedState) {
            assert.equal(handled.state, testKey !== "sync" ? "pending" : "rejected", "The handling promise should be pending");
        }

        assert.equal(finallyCalled, testKey !== "sync" ? false : true, "Finally handler should not have been called");

        await waitForUnhandledRejection();

        assert.equal(finallyCalled, true, "Finally handler should have been called");
        if (checkChainedState) {
            assert.equal(handled.state, "rejected", "The handling promise should be rejected");
        }

        assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
    });
}
