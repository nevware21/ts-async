/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { arrForEach, asString, dumpObj, getGlobal, isNode, isWebWorker, objHasOwn, scheduleTimeout, setBypassLazyCache } from "@nevware21/ts-utils";
import { createAsyncPromise, createAsyncRejectedPromise } from "../../../src/promise/asyncPromise";
import { IPromise } from "../../../src/interfaces/IPromise";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { PolyPromise } from "../../../src/polyfills/promise";
import { createSyncRejectedPromise } from "../../../src/promise/syncPromise";
import { createIdleRejectedPromise } from "../../../src/promise/idlePromise";
import { createNativeRejectedPromise } from "../../../src/promise/nativePromise";
import { objForEachKey } from "@nevware21/ts-utils";
import { arrSlice } from "@nevware21/ts-utils";

function _getCaller(start: number) {
    let stack = new Error().stack;
    if (stack) {
        let lines = stack.split("\n");
        if (lines.length > start) {
            return arrSlice(lines, start, start + 5).join("\n") + "\n...";
        }
    }

    return null;
}

let _unhandledEvents: any[] = [];
function _unhandledrejection(event: any) {
    let found = false;
    // The combination of node and mocha seems to cause any process.emit events to get duplicated (emitted twice)
    arrForEach(_unhandledEvents, (evt) => {
        if (evt.p === event.promise) {
            found = true;
            return -1;
        }
    });

    if (!found) {
        _unhandledEvents.push({
            type: dumpObj((event as any).type),
            name: dumpObj((event as any).name),
            evt: dumpObj(event),
            p: event.promise,
            promise: asString(event.promise),
            stack: _getCaller(1)
        });
        //console.log("Unhandled Rejection received: " + prefix + dumpObj(event));
    }

    event.stopPropagation && event.stopPropagation();
}

function _unhandledNodeRejection(reason: any, promise: any) {
    //console.log && console.log("Unhandled Node Rejection received: " + asString(promise) + "\n" + dumpObj(reason));

    let found = false;
    // The combination of node and mocha seems to cause any process.emit events to get duplicated (emitted twice)
    arrForEach(_unhandledEvents, (evt) => {
        if (evt.p === promise) {
            found = true;
            return -1;
        }
    });

    if (!found) {
        let stack = new Error().stack;
        let lines = stack ? stack.split("\n") : [];

        // let prefix = promise.toString() + " :: ";
        _unhandledEvents.push({
            type: "node",
            reason: asString(reason),
            p: promise,
            promise: asString(promise),
            stack: (arrSlice(lines, 1, 6).join("\n")) + "\n..."
        });
        //console.log("Unhandled Node Rejection received: " + prefix + dumpObj(reason));
    }

    return "Handled!";
}

interface TestDefinition {
    rejected: <T>(reason: any) => IPromise<T>;
    checkState: boolean;
    checkChainedState: boolean;
}

type TestImplementations = { [key: string]: TestDefinition };

let testImplementations: TestImplementations = {
    "system": {
        // rejected: Promise.reject.bind(Promise),
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
        rejected: PolyPromise.reject.bind(PolyPromise),
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

function waitForUnhandledRejection() {
    //console.log("Waiting for unhandled rejection event(s)");
    // Wait for unhandled rejection event
    return createAsyncPromise((resolve) => {
        let attempt = 0;
        let waiting = scheduleTimeout(() => {
            //console.log("[" + attempt + "]: Waiting for unhandled rejection event(s) - " + _unhandledEvents.length);
            if (attempt < 5) {
                attempt++;
                waiting.refresh();
            } else if (_unhandledEvents.length > 0) {
                resolve(true);
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
        //console.log("Clearing unhandled rejection listeners");
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
            //console.log("Adding Node Rejection Listener");
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
            //console.log("Removing Node Rejection Listener");
            process.off("unhandledRejection", _unhandledNodeRejection);
        }
        
        // Re-Ensable lazy caching
        setBypassLazyCache(false);
    });

    it("Test pre-rejected promise with no handler", async () => {
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise - pre-rejected promise with no handler"));
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
