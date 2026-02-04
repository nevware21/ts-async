/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { getGlobal, objHasOwn, isWebWorker, isNode, scheduleTimeout, dumpObj, arrForEach, objForEachKey, setBypassLazyCache, CreateIteratorContext, isPromiseLike, setDefaultIdleTimeout } from "@nevware21/ts-utils";
import { PolyPromise } from "../../../src/polyfills/promise";
import { createAsyncAllPromise, createAsyncAllSettledPromise, createAsyncAnyPromise, createAsyncPromise, createAsyncRacePromise, createAsyncRejectedPromise, createAsyncResolvedPromise } from "../../../src/promise/asyncPromise";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { createIdleAllPromise, createIdleAllSettledPromise, createIdleAnyPromise, createIdlePromise, createIdleRacePromise, createIdleRejectedPromise, createIdleResolvedPromise } from "../../../src/promise/idlePromise";
import { IPromise } from "../../../src/interfaces/IPromise";
import { _clearPromiseCache, createNativeAllPromise, createNativeAllSettledPromise, createNativeAnyPromise, createNativePromise, createNativeRacePromise, createNativeRejectedPromise, createNativeResolvedPromise } from "../../../src/promise/nativePromise";
import { createSyncAllPromise, createSyncAllSettledPromise, createSyncAnyPromise, createSyncPromise, createSyncRacePromise, createSyncRejectedPromise, createSyncResolvedPromise } from "../../../src/promise/syncPromise";
import { PromiseExecutor } from "../../../src/interfaces/types";
import { createAllPromise, createPromise, setCreatePromiseImpl, createAllSettledPromise, createResolvedPromise, createRejectedPromise, createRacePromise, createAnyPromise } from "../../../src/promise/promise";
import { createIterator } from "@nevware21/ts-utils";
import { createIterable } from "@nevware21/ts-utils";
import { IPromiseResult } from "../../../src/interfaces/IPromiseResult";
import { createTimeoutPromise } from "../../../src/promise/timeoutPromise";

function _expectException(cb: () => void, message: string) {
    try {
        cb();
        assert.ok(false, "expected an exception to be thrown with undefined");
    } catch(e) {
        assert.ok(e.message.indexOf(message) != -1, "Expected the exception message to include [" + message + "] as the reason for failure was [" + dumpObj(e) + "]");
    }
}

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
        //let prefix = promise.toString() + " :: ";
        _unhandledEvents.push({
            reason,
            promise
        });
        //console.log("Unhandled Node Rejection received: " + prefix + dumpObj(reason));
    }
}

interface TestDefinition {
    creator: <T>(executor: PromiseExecutor<T>) => IPromise<T>;
    resolved: <T>(value: T) => IPromise<T>;
    rejected: <T>(reason: any) => IPromise<T>;
    creatorAllSettled: <T>(values: Iterable<T | PromiseLike<T>>, timeout?: number) => IPromise<IPromiseResult<Awaited<T>>[]>;
    creatorRace: <T>(values: Iterable<T | PromiseLike<T>>, timeout?: number) => IPromise<Awaited<T>>;
    creatorAny: <T>(values: Iterable<T | PromiseLike<T>>, timeout?: number) => IPromise<Awaited<T>>;
    creatorAll: <T>(input: Iterable<PromiseLike<T>>) => IPromise<T[]>;
    checkState: boolean;
    checkChainedState: boolean;
}

type TestImplementations = { [key: string]: TestDefinition };

let testImplementations: TestImplementations = {
    "system": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new Promise<T>(executor);
        },
        resolved: Promise.resolve.bind(Promise),
        rejected: Promise.reject.bind(Promise),
        creatorAllSettled: Promise.allSettled.bind(Promise),
        creatorRace: Promise.race.bind(Promise),
        creatorAny: (Promise as any)["any"].bind(Promise),
        creatorAll: Promise.all.bind(Promise),
        checkState: false,
        checkChainedState: false
    },
    "native": {
        creator: createNativePromise,
        resolved: createNativeResolvedPromise,
        rejected: createNativeRejectedPromise,
        creatorAllSettled: createNativeAllSettledPromise,
        creatorRace: createNativeRacePromise,
        creatorAny: createNativeAnyPromise,
        creatorAll: createNativeAllPromise,
        checkState: true,
        checkChainedState: false
    },
    "no-native": {
        creator: createNativePromise,
        resolved: createNativeResolvedPromise,
        rejected: createNativeRejectedPromise,
        creatorAllSettled: createNativeAllSettledPromise,
        creatorRace: createNativeRacePromise,
        creatorAny: createNativeAnyPromise,
        creatorAll: createNativeAllPromise,
        checkState: true,
        checkChainedState: false
    },
    "async": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createAsyncPromise<T>(executor, 1);
        },
        resolved: createAsyncResolvedPromise,
        rejected: createAsyncRejectedPromise,
        creatorAllSettled: createAsyncAllSettledPromise,
        creatorRace: createAsyncRacePromise,
        creatorAny: createAsyncAnyPromise,
        creatorAll: createAsyncAllPromise,
        checkState: true,
        checkChainedState: true
    },
    "idle": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createIdlePromise<T>(executor, 10);
        },
        resolved: createIdleResolvedPromise,
        rejected: createIdleRejectedPromise,
        creatorAllSettled: createIdleAllSettledPromise,
        creatorRace: createIdleRacePromise,
        creatorAny: createIdleAnyPromise,
        creatorAll: createIdleAllPromise,
        checkState: true,
        checkChainedState: true
    },
    "idle-def": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createIdlePromise<T>(executor);
        },
        resolved: createIdleResolvedPromise,
        rejected: createIdleRejectedPromise,
        creatorAllSettled: createIdleAllSettledPromise,
        creatorRace: createIdleRacePromise,
        creatorAny: createIdleAnyPromise,
        creatorAll: createIdleAllPromise,
        checkState: true,
        checkChainedState: true
    },
    "sync": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createSyncPromise<T>(executor);
        },
        resolved: createSyncResolvedPromise,
        rejected: createSyncRejectedPromise,
        creatorAllSettled: createSyncAllSettledPromise,
        creatorRace: createSyncRacePromise,
        creatorAny: createSyncAnyPromise,
        creatorAll: createSyncAllPromise,
        checkState: true,
        checkChainedState: true
    },
    "polyfill": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new PolyPromise(executor);
        },
        resolved: PolyPromise.resolve,
        rejected: PolyPromise.reject,
        creatorAllSettled: PolyPromise.allSettled,
        creatorRace: PolyPromise.race,
        creatorAny: PolyPromise.any,
        creatorAll: PolyPromise.all,
        checkState: true,
        checkChainedState: true
    },
    "default": {
        creator: createPromise,
        resolved: createResolvedPromise,
        rejected: createRejectedPromise,
        creatorAllSettled: createAllSettledPromise,
        creatorRace: createRacePromise,
        creatorAny: createAnyPromise,
        creatorAll: createAllPromise,
        checkState: false,
        checkChainedState: false
    }
}

function _log(message: string) {
    if (console && console.log) {
        //console.log(message);
    }
}

describe("Validate Promise Await Usage tests", async () => {
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

function batchTests(testKey: string, definition: TestDefinition) {

    let createNewPromise = definition.creator;
    let createRejectedPromise = definition.rejected;
    let createAllSettledPromise = definition.creatorAllSettled;
    let createResolvedPromise = definition.resolved;
    let createRacePromise = definition.creatorRace;
    let createAnyPromise = definition.creatorAny;
    let createAllPromise = definition.creatorAll;
    let checkState = definition.checkState;
    let checkChainedState = definition.checkChainedState;

    beforeEach(() => {
        createNewPromise = definition.creator;
        createRejectedPromise = definition.rejected;
        createAllSettledPromise = definition.creatorAllSettled;
        createResolvedPromise = definition.resolved;
        createAnyPromise = definition.creatorAny;
        createAllPromise = definition.creatorAll;
        checkState = definition.checkState;
        checkChainedState = definition.checkChainedState;

        _unhandledEvents = [];
        function _debug(id: string, message: string) {
            //console && console.log && console.log("Debug[" + id + "]:" + message);
        }

        if (testKey === "default") {
            setCreatePromiseImpl(null as any);
        } else {
            setCreatePromiseImpl(definition.creator);
        }

        // Use test hook to clear the promise caches
        _clearPromiseCache(testKey !== "no-native");

        setPromiseDebugState(true, _debug);
        
        // Disable lazy caching
        setBypassLazyCache(true);
        setDefaultIdleTimeout(100);

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
        setPromiseDebugState(false);
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

    it("Test promise with missing resolver", () => {
        _expectException(() => {
            createNewPromise(undefined as any);
        }, " is not a function");

        _expectException(() => {
            createNewPromise(null as any);
        }, " is not a function");
        
        _expectException(() => {
            createNewPromise(undefined as any);
        }, " is not a function");
    });

    it("Test promise with invalid resolver", () => {
        _expectException(() => {
            createNewPromise("Hello World" as any);
        }, " is not a function");

        _expectException(() => {
            createNewPromise(false as any);
        }, " is not a function");

        _expectException(() => {
            createNewPromise(true as any);
        }, " is not a function");
    });

    it("Test clearing the default promise creator", async () => {
        setCreatePromiseImpl(null as any);
        let promise = createPromise((resolve) => {
            resolve(12);
        });
    
        if (testKey !== "no-native") {
            assert.ok(promise instanceof Promise, "Check that it was a native Promise");
        }
        
        assert.ok(isPromiseLike(promise), "Check that it was a native Promise");
        assert.equal(await promise, 12);
    });

    it("Test resolving promise asynchronously using then/catch with timeout", async () => {
        let resolvedValue: any = null;
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;
        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                resolve(42);
            }, 10);
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");
        
        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }, (value) => {
            rejectedValue = value;
        });

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "The State should still be pending");
        }

        if (checkChainedState) {
            // The chained promise should be pending
            assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");
        }

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");
        
        let result = await chainedPromise;

        if (checkState) {
            // The asynchronous promise should be resolved
            assert.equal(promise.state, "resolved", dumpObj(promise));
        }

        if (checkChainedState) {
            // The chained promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "The chained promises are also async promises and have a state");
        }

        assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
    });

    it("Test resolving promise asynchronously using then/catch with timeout with finally", async () => {
        let resolvedValue: any = null;
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;
        let finallyCalled = false;
        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                resolve(42);
            }, 10);
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }, (value) => {
            rejectedValue = value;
        }).finally(() => {
            finallyCalled = true;
        });

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be pending
            assert.equal(chainedPromise.state, "pending", "Check chained promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");
        assert.equal(finallyCalled, false, "finally should not have been called yet");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");
        
        let result = await chainedPromise;

        assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
        assert.equal(finallyCalled, true, "finally should have been executed");

        if (checkState) {
            // The asynchronous promise should be resolved
            assert.equal(promise.state, "resolved", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "Check chained promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test resolving promise asynchronously using then/catch with synchronous executor", async () => {
        let resolvedValue: any = null;
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            resolve(42);
            executorResolved = true;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should not have called the resolve");
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");

        if (checkState) {
            // The asynchronous promise should be resolved
            assert.equal(promise.state, "resolved", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }).catch((value) => {
            rejectedValue = value;
        });

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");

        if (testKey !== "sync") {
            // Should not be resolved or rejected yet as this should happen asynchronously
            assert.equal(resolvedValue, null, "Expected the promise chain to not yet be resolved");
            assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");

            if (checkChainedState) {
                // The asynchronous promise should be pending
                assert.equal(chainedPromise.state, "pending", "Check promise state");
            }
    
            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
                
        } else {
            // Should be resolved or rejected as this should happen synchronously
            assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved already");
            assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");

            if (checkChainedState) {
                // The asynchronous promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "Check promise state");
            }
    
            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        }

        let result = await chainedPromise;

        assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");

        if (checkChainedState) {
            // The asynchronous promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test rejecting asynchronous promise using timeout ", async () => {
        let resolvedValue: any = null;
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                reject(-42);
            }, 10);
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        
        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }, (value) => {
            _log("Chained Promise catch " + dumpObj(value));
            rejectedValue = value;
            return value;
        }) as any;

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be pending
            assert.equal(chainedPromise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let result = await chainedPromise;

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");

        if (checkState) {
            // The asynchronous promise should be rejected
            assert.equal(promise.state, "rejected", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections - " + JSON.stringify(_unhandledEvents));
    });
       
    it("Test rejecting promise immediately ", async () => {

        let resolvedValue: any = null;
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            reject(-42);
            executorResolved = true;
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should not have called the resolve");

        if (checkState) {
            // The asynchronous promise should be rejected
            assert.equal(promise.state, "rejected", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }).catch((value) => {
            rejectedValue = value;
            return value;
        });

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        if (testKey !== "sync") {
            // Should not be resolved or rejected yet as this should happen asynchronously
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

            if (checkChainedState) {
                // The asynchronous promise should be pending
                assert.equal(chainedPromise.state, "pending", "Check promise state");
            }
        } else {
            // Should already be resolved or rejected as this should happen synchronously
            assert.equal(resolvedValue, null, "Expected the promise to be resolved");
            assert.equal(rejectedValue, -42, "Expected the promise to be rejected already");
            if (checkChainedState) {
                // The asynchronous promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "Check promise state");
            }
        }

        let result = await chainedPromise;

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");

        if (checkState) {
            // The asynchronous promise should be rejected
            assert.equal(promise.state, "rejected", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test rejecting promise immediately without a reject handler ", async () => {

        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            reject(-42);
            executorResolved = true;
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should not have called the resolve");

        if (checkState) {
            // The asynchronous promise should be rejected
            assert.equal(promise.state, "rejected", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let chainedPromise = promise.then((value) => {
            assert.fail("Should never get called!");
        });

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        if (testKey !== "sync") {
            if (checkChainedState) {
                // The asynchronous promise should be pending
                assert.equal(chainedPromise.state, "pending", "Check promise state");
            }
        } else {
            if (checkChainedState) {
                // The asynchronous promise should be rejected
                assert.equal(chainedPromise.state, "rejected", "Check promise state");
            }
        }

        try {
            await chainedPromise;
        } catch (e) {
            assert.equal(e, -42, "Validate rejected value - " + dumpObj(e));
        }

        if (checkChainedState) {
            // The asynchronous promise should be rejected
            assert.equal(chainedPromise.state, "rejected", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test rejecting asynchronous promise using timeout with only catch and returning a value", async () => {
        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                reject(-42);
            }, 10);
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");

        if (checkState) {
            // The asynchronous promise should be pending
            assert.equal(promise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        
        let chainedPromise = promise.catch((value) => {
            rejectedValue = value;
            return value;
        }) as any;

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        if (checkChainedState) {
            // The asynchronous promise should be pending
            assert.equal(chainedPromise.state, "pending", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        let result = await chainedPromise;

        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");

        if (checkState) {
            // The asynchronous promise should be rejected
            assert.equal(promise.state, "rejected", "Check promise state");
        }

        if (checkChainedState) {
            // The asynchronous promise should be resolved
            assert.equal(chainedPromise.state, "resolved", "Check promise state");
        }

        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });
       
    it("Test rejecting promise immediately with only catch", async () => {

        let rejectedValue: any = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            reject(-42);
            executorResolved = true;
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should not have called the resolve");

        let chainedPromise = promise.catch((value) => {
            rejectedValue = value;
            return value;
        });

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        if (testKey !== "sync") {
            // Should not be resolved or rejected yet as this should happen asynchronously
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        } else {
            // Should already be resolved or rejected yet as this should happen synchronously
            assert.equal(rejectedValue, -42, "Expected the promise to be rejected already");
        }

        let result = await chainedPromise;

        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");
    });

    it("Test rejecting promise by throwing immediately", async () => {
        let resolvedValue: any = null;
        let rejectedValue: Error | null = null;
        let executorRun = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            throw new Error("Simulated failure!");
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
            return value;
        }, (value) => {
            rejectedValue = value;
            return value;
        });

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");

        if (testKey !== "sync") {
            // Should not be resolved or rejected yet as this should happen asynchronously
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        } else {
            // Should already be resolved or rejected as this should happen synchronously
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
            assert.notEqual(rejectedValue, null, "Expected the promise to be rejected already");
            assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated failure!") != -1, "Expected the promise to be rejected with the contained exception");
        }

        let result: any = await chainedPromise;

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.ok(rejectedValue != null, "Expected the promise to be rejected with a value");
        assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated failure!") != -1, "Expected the promise to be rejected with the contained exception");
        assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");

    });

    it("Test rejecting promise by throwing with timeout", async () => {

        let resolvedValue: any = null;
        let rejectedValue: Error | null = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                try {
                    throw new Error("Simulated failure!");
                } catch (e) {
                    reject(e);
                }
            }, 10);
        }).then((value) => {
            resolvedValue = value;
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should have been run already");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        let terminalError = null;
        // Will actually never get executed
        let result = await promise.then((value) => {
            assert.ok(false, "Terminal then occurred -- it should not");
        },
        (reason) => {
            // Try catching unhandled
            terminalError = reason;
        });

        assert.ok(terminalError !== null, "Terminal error thrown and caught");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have been run already");

        // The promise was still never processed
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result as any, rejectedValue, "Expected the promise to await with the rejected value");
    });

    it("Test resolving promise with a returned value with timeout", async () => {
        let resolvedValue: any= null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<any>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                resolve(42);
            }, 10);
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have been run already");

        let chainedPromise = promise.then((value) => {
            return 53;
        }).then((value) => {
            resolvedValue = value;
            return value;
        });

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have been run already");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");

        let result = await chainedPromise;

        assert.equal(resolvedValue, 53, "Expected the promise to be resolved with the returned value not the initial resolved value");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");

    });

    it("Test resolving promise with a returned value immediately", async () => {

        let resolvedValue: any= null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createNewPromise<any>((resolve, reject) => {
            executorRun = true;
            resolve(42);
            executorResolved = true;
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should also have been run already");

        let finalResolve = false;
        let chainedPromise2 = promise.then((value) => {
            //console.log("Intervening:" + value);
            // Don't return anything
        }).then((value) => {
            //console.log("Final:" + value);
            resolvedValue = value;
            finalResolve = true;
        });

        assert.notEqual(chainedPromise2 as any, promise, "Expect that the chained promise is not the same as the original promise");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should not have been run already");

        if (testKey !== "sync") {
            // Should not be resolved or rejected yet as this should happen asynchronously
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
            assert.equal(finalResolve, false, "Expected the final promise to not be resolved yet");
        } else {
            // Should be resolved or rejected yet as this should happen synchronously
            assert.equal(resolvedValue, undefined, "Expected the promise to be resolved already with undefined result");
            assert.equal(finalResolve, true, "Expected the final promise to be resolved already");
        }

        let result = await chainedPromise2;

        assert.equal(finalResolve, true, "Expected the final promise to not be resolved yet");
        assert.equal(resolvedValue, undefined, "Expected the promise to be resolved with undefined from the Promise returned by the initial then");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
    });

    it("Test resolving promise with an asynchronously pre-resolved promise", async () => {
        let preResolved = Promise.resolve(53);

        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createNewPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        let chainedPromise = promise.then((value) => {
            return preResolved;
        }).then((value) => {
            resolvedValue = value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        let result: any = await chainedPromise;

        assert.equal(resolvedValue, 53, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, undefined, "Expected the promise to await with the resolved value");

    });

    it("Test resolving a promise multiple times", async () => {
        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createNewPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
                resolve(53);
            }, 10);
        });
        
        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        let result: any = await chainedPromise;

        assert.equal(resolvedValue, 42, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, undefined, "Expected the promise to await with the resolved value");
    });

    it("Test rejecting a promise after resolving it", async () => {
        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createNewPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
                reject(53);
            }, 10);
        });
        
        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        let result: any = await chainedPromise;

        assert.equal(resolvedValue, 42, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, undefined, "Expected the promise to await with the resolved value");
    });

    it("Test resolving promise with an asynchronous value and then a pre-rejected promise", async () => {
        let preRejected = createRejectedPromise(new Error("Simulated Pre Rejected Promise"));

        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createNewPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        promise.then((value) => {
            return value + 1;
        }).then((value) => {
            assert.equal(value, 43, "Expected this value to be 43");
        });

        let chainedPromise = promise.then((value) => {
            assert.equal(value, 42, "Expected the value to be 42");
            return preRejected;
        }).then((value) => {
            resolvedValue = value as any;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        let result = await chainedPromise;

        assert.equal(resolvedValue, null, "Expected the promise to be resolved");
        assert.ok(rejectedValue != null, "Expected the promise to be rejected with a value");
        assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated Pre Rejected Promise") != -1, "Expected the promise to be rejected with the contained exception");
        assert.equal(result as any, resolvedValue, "Expected the promise to await with the resolved value");

        // Wait for unhandled rejection event
        await createNewPromise((resolve) => {
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
            }, 150);
        });
    });

    it("Test resolving promise with an asynchronously with an un-resolved promise", async () => {

        let executorResolved = false;
        let unresolvedPromise = createNewPromise((resolve, reject) => {
            setTimeout(() => {
                executorResolved = true;
                resolve(68);
            }, 1000);
        });

        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createNewPromise<number>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        let chainedPromise2 = promise.then((value) => {
            return unresolvedPromise;
        }).then((value) => {
            resolvedValue = value as any;
            return value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, false, "The executor has not yet resolved");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        assert.equal(executorResolved, false, "The executor has not yet resolved");

        // We need to call await to let the "real" new JS execution cycle to occur
        let result = await chainedPromise2;

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, true, "The executor has not yet resolved");

        assert.equal(resolvedValue, 68, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
    });

    it ("check initial resolve with another promise", async () => {
        let executorResolved = false;
        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;

        let promise = createNewPromise<number>((resolve, reject) => {
            resolve(createNewPromise((resolve2) => {
                setTimeout(() => {
                    executorResolved = true;
                    resolve2(42);
                }, 10);
            }));
        });

        let chainedPromise2 = promise.then((value) => {
            resolvedValue = value as any;
            return value * 2;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, false, "The executor has not yet resolved");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        assert.equal(executorResolved, false, "The executor has not yet resolved");

        // We need to call await to let the "real" new JS execution cycle to occur
        let result = await chainedPromise2;

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, true, "The executor has not yet resolved");

        assert.equal(resolvedValue, 42, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, 84, "Expected the promise to await with the resolved value");
    });

    it ("check initial resolve with another promise that is resolved with another promise", async () => {
        let executorResolved = false;
        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;

        let promise = createNewPromise<number>((resolve, reject) => {
            resolve(createNewPromise((resolve2) => {
                setTimeout(() => {
                    executorResolved = true;
                    resolve2(createNewPromise((resolve2) => {
                        setTimeout(() => {
                            executorResolved = true;
                            resolve2(42);
                        }, 10);
                    }));
                }, 10);
            }));
        });

        let chainedPromise2 = promise.then((value) => {
            resolvedValue = value as any;
            return value * 2;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, false, "The executor has not yet resolved");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        assert.equal(executorResolved, false, "The executor has not yet resolved");

        // We need to call await to let the "real" new JS execution cycle to occur
        let result = await chainedPromise2;

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, true, "The executor has not yet resolved");

        assert.equal(resolvedValue, 42, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
        assert.equal(result, 84, "Expected the promise to await with the resolved value");
    });

    it ("check initial resolve with another promise that gets rejected", async () => {
        let executorResolved = false;
        let resolvedValue : number | null= null;
        let rejectedValue: any = null;
        let finallyCalled = false;
        let catchCalled = false;
        let rejectError = new Error("Delay rejected!");

        let promise = createNewPromise<number>((resolve) => {
            resolve(createNewPromise((resolve, reject) => {
                setTimeout(() => {
                    executorResolved = true;
                    reject(rejectError);
                }, 10);
            }));
        });
        
        promise.catch((f1) => {
            //console.log("failed 1: " + dumpObj(f1));
            catchCalled = true;
        }).finally(() => {
            finallyCalled = true;
        });

        let chainedPromise2 = promise.then((value) => {
            resolvedValue = value as any;
            return value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, false, "The executor has not yet resolved");
        assert.equal(catchCalled, false, "catch was not called");
        assert.equal(finallyCalled, false, "finally was not called");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        assert.equal(executorResolved, false, "The executor has not yet resolved");

        let result;
        try {
            // We need to call await to let the "real" new JS execution cycle to occur
            result = await chainedPromise2;
        } catch (e) {
            assert.ok(true, dumpObj(e));
        }

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, true, "The executor has been resolved");
        assert.equal(catchCalled, true, "catch called");
        assert.equal(finallyCalled, true, "finally was called");

        assert.equal(resolvedValue, null, "Expected the resolved value to not be set");
        assert.equal(rejectedValue, rejectError, "Expected the promise to be rejected with an error");
        assert.equal(result, undefined, "Expected the promise to await with undefined");
    });

    it ("check initial resolve with another promise that is resolved with another promise that gets rejected", async () => {
        let executorResolved = 0;
        let resolvedValue : number | null= null;
        let rejectedValue: any = null;
        let finallyCalled = false;
        let catchCalled = false;
        let rejectError = new Error("Delay rejected!");

        let promise = createNewPromise<number>((resolve) => {
            resolve(createNewPromise((resolve, reject) => {
                setTimeout(() => {
                    executorResolved = 1;
                    resolve(createNewPromise((resolve, reject) => {
                        setTimeout(() => {
                            executorResolved++;
                            reject(rejectError);
                        }, 10);
                    }));
                }, 10);
            }));
        });
        
        promise.catch((f1) => {
            //console.log("failed 1: " + dumpObj(f1));
            catchCalled = true;
        }).finally(() => {
            finallyCalled = true;
        });

        let chainedPromise2 = promise.then((value) => {
            resolvedValue = value as any;
            return value;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, 0, "The executor has not yet resolved");
        assert.equal(catchCalled, false, "catch was not called");
        assert.equal(finallyCalled, false, "finally was not called");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        assert.equal(executorResolved, 0, "The executor has not yet resolved");

        let result;
        try {
            // We need to call await to let the "real" new JS execution cycle to occur
            result = await chainedPromise2;
        } catch (e) {
            assert.ok(true, dumpObj(e));
        }

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, 2, "The executor has been resolved");
        assert.equal(catchCalled, true, "catch called");
        assert.equal(finallyCalled, true, "finally was called");

        assert.equal(resolvedValue, null, "Expected the resolved value to not be set");
        assert.equal(rejectedValue, rejectError, "Expected the promise to be rejected with an error");
        assert.equal(result, undefined, "Expected the promise to await with undefined");
    });

    it("check finally handling", async () => {

        assert.equal(await createNewPromise((resolve, reject) => {
            resolve(2);
        }).then(()=> 77), 77, "Expect the result to be 77");

        assert.equal(await createNewPromise((resolve, reject) => {
            resolve(2);
        }).finally(()=> 77), 2, "Expect the result to be 2");
    });

    it("check creating a resolved promise with another promise", async () => {

        let otherPromise = createNewPromise((resolve, reject) => {
            scheduleTimeout(() => {
                resolve(21);
            }, 0);
        });
        
        let promise = createResolvedPromise(otherPromise);
        assert.ok(otherPromise === promise);

        let result = await promise;
        assert.equal(result, 21);
    });

    describe("createAllPromise", () => {
        it("check create all with nothing", async () => {
            let promise = createAllPromise([]);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            let values2 = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            assert.ok(values === values2);
        });
    
        it("check create all with values resolved in the reverse order", async () => {
            let promise = createAllPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 5)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(42);
                    }, 0)
                })
            ]);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 2, "Two elements should have been returned");
            assert.equal(values[0], 21);
            assert.equal(values[1], 42);
    
            let values2 = await promise;
            assert.ok(values2, "A values object should have been returned");
            assert.equal(values2.length, 2, "Two elements should have been returned");
    
            assert.ok(values === values2);
        });
    
        it("check create all with values resolved in the order", async () => {
            let promise = createAllPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 0)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(42);
                    }, 5)
                })
            ]);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 2, "Two elements should have been returned");
            assert.equal(values[0], 21);
            assert.equal(values[1], 42);
    
            let values2 = await promise;
            assert.ok(values2, "A values object should have been returned");
            assert.equal(values2.length, 2, "Two elements should have been returned");
    
            assert.ok(values === values2);
        });
    
        it("check create all with values resolved in the order with a rejected promise", async () => {
            let promise = createAllPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 0)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        reject(new Error("Simulated failure"));
                    }, 5)
                })
            ]);
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
        });
    
        it("check create all with values resolved in the order with a rejected promise and a finally", async () => {
            let promise = createAllPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 0)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        reject(new Error("Simulated failure"));
                    }, 5)
                })
            ]).finally(() => {
                //console.log("Finally called");
            });
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
        });
    
        it("check create all with values resolved in the order with a rejected promise and a finally and a catch", async function () {
            this.timeout(20000);
            let catchCalled = false;
            let finallyCalled = false;
            let promise = createAllPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 0)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        reject(new Error("Simulated failure"));
                    }, 5)
                })
            ]).finally(() => {
                finallyCalled = true;
            }).catch((e) => {
                catchCalled = true;
            });
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
    
            assert.equal(catchCalled, true, "Catch was called");
            assert.equal(finallyCalled, true, "Finally was called");
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e.message, "Simulated failure");
            }
        });
    
        it("check create all where a resolve function throws", async () => {
            let promise = createAllPromise([
                createRejectedPromise("Rejected"),
                createResolvedPromise(42)
            ]).finally(() => {
                //console.log("Finally called");
            });
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e, "Rejected");
            }
    
            try {
                await promise;
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
                assert.equal(e, "Rejected");
            }
        });
    });
    
    describe("createAllSettledPromise with Array", () => {
        it("check create all settled with nothing", async () => {
            let promise = createAllSettledPromise([]);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            let values2 = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            assert.ok(values === values2);
        });

        it("check create all settled with values resolved in the reverse order", async () => {
            let promise = createAllSettledPromise([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 5)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(42);
                    }, 0)
                })
            ]);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 2, "Two elements should have been returned");
            assert.equal(values[0].status, "fulfilled");
            assert.equal(values[0].value, 21);
            assert.equal(values[1].status, "fulfilled");
            assert.equal(values[1].value, 42);
    
            let values2 = await promise;
            assert.ok(values2, "A values object should have been returned");
            assert.equal(values2.length, 2, "Two elements should have been returned");
    
            assert.ok(values === values2);

            Promise.allSettled([
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(21);
                    }, 5)
                }),
                createNewPromise((resolve, reject) => {
                    scheduleTimeout(() => {
                        resolve(42);
                    }, 0)
                })
            ]);
        });
    });

    describe("createAllSettledPromise with Iterator", () => {
        it("check create all settled with nothing", async () => {
            let theValues: any[] = [ ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createAllSettledPromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });

        it("check create all settled with some values", async () => {
            let theValues = [ 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createAllSettledPromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });
    });

    describe("createAllSettledPromise with Iterable", () => {
        it("check create all settled with nothing", async () => {
            let fibCtx: CreateIteratorContext<number> = {
                n: function() {
                    // Return done
                    return true;
                }
            };
            
            let theIterator = createIterable<number>(fibCtx);
            let promise = createAllSettledPromise(theIterator);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            let values2 = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 0, "No elements should have been returned");
    
            assert.ok(values === values2);
        });

        it("check create all settled with some values", async () => {
            let current = 0;
            let next = 1;
            let fibCtx: CreateIteratorContext<number> = {
                n: function() {
                    fibCtx.v = current;
                    current = next;
                    next = fibCtx.v + next;
            
                    // Stop once the value is > 32
                    return next > 32;
                },
                r: function(value) {
                    return value;
                }
            };
            
            let theIterator = createIterable<number>(fibCtx);
            let promise = createAllSettledPromise(theIterator);
    
            let values = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 7, "No elements should have been returned");
            assert.deepEqual(values.map((v) => v.status), [ "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled" ]);
            assert.deepEqual(values.map((v) => v.value), [ 0, 1, 1, 2, 3, 5, 8 ]);

            let values2 = await promise;
            assert.ok(values, "A values object should have been returned");
            assert.equal(values.length, 7, "No elements should have been returned");
            assert.deepEqual(values.map((v) => v.status), [ "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled" ]);
            assert.deepEqual(values.map((v) => v.value), [ 0, 1, 1, 2, 3, 5, 8 ]);

            assert.ok(values === values2);
            assert.equal(values, values2);
        });
    });

    describe("createAllSettledPromise with rejected", () => {
        it("should handle a mixture of fulfilled and rejected promise values", async () => {
            const promises = [
                createResolvedPromise("resolved1"),
                createRejectedPromise("rejected1"),
                createResolvedPromise("resolved2"),
                createRejectedPromise("rejected2")
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createAllSettledPromise(theIterator);

            const values = await promise;

            assert.deepEqual(values, [
                { status: "fulfilled", value: "resolved1" },
                { status: "rejected", reason: "rejected1" },
                { status: "fulfilled", value: "resolved2" },
                { status: "rejected", reason: "rejected2" }
            ]);
        });
    });

    describe("createRacePromise with Array", () => {

        it("should resolve with the value of the first resolved promise", async () => {
            const promises = [
                createNewPromise((resolve) => setTimeout(() => resolve("slow"), 300)),
                createNewPromise((resolve) => setTimeout(() => resolve("fast"), 150)),
                createNewPromise((resolve) => setTimeout(() => resolve("slowest"), 450))
            ];

            const promise = createRacePromise(promises);

            const value = await promise;

            assert.equal(value, "fast");
        });

        it("should reject with the reason of the first rejected promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("slow"), 300)),
                createNewPromise((_, reject) => setTimeout(() => reject("fast"), 150)),
                createNewPromise((_, reject) => setTimeout(() => reject("slowest"), 450))
            ];

            const promise = createRacePromise(promises);

            try {
                await promise;
            } catch (e) {
                assert.equal(e, "fast");
            }
        });

        it("should resolve with the value of the first resolved promise - sync first", async () => {
            const promises = [
                createResolvedPromise("sync"),
                createNewPromise((resolve) => setTimeout(() => resolve("fast"), 150)),
                createNewPromise((resolve) => setTimeout(() => resolve("slowest"), 300))
            ];

            const promise = createRacePromise(promises);

            const value = await promise;

            assert.equal(value, "sync");

            // Wait for the slowest promise to resolve so that it doesn't cause an unhandled rejection later
            await createTimeoutPromise(200, true);
        });

        it("should reject with the reason of the first rejected promise - sync first", async () => {
            const promises = [
                createRejectedPromise("sync"),
                createNewPromise((_, reject) => setTimeout(() => reject("fast"), 150)),
                createNewPromise((_, reject) => setTimeout(() => reject("slowest"), 300))
            ];

            const promise = createRacePromise(promises);

            try {
                await promise;
            } catch (e) {
                assert.equal(e, "sync");
            }

            // Wait for the slowest promise to resolve so that it doesn't cause an unhandled rejection later
            await createTimeoutPromise(200, true);
        });
    });

    describe("createRacePromise with Iterable", () => {
        it("should resolve with the value of the first resolved promise", async () => {
            const promises = [
                createNewPromise((resolve) => setTimeout(() => resolve("slow"), 300)),
                createNewPromise((resolve) => setTimeout(() => resolve("fast"), 150)),
                createNewPromise((resolve) => setTimeout(() => resolve("slowest"), 450))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createRacePromise(theIterator);

            const value = await promise;

            assert.equal(value, "fast");
        });

        it("should reject with the reason of the first rejected promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("slow"), 300)),
                createNewPromise((_, reject) => setTimeout(() => reject("fast"), 10)),
                createNewPromise((_, reject) => setTimeout(() => reject("slowest"), 450))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createRacePromise(theIterator);

            try {
                await promise;
            } catch (e) {
                assert.equal(e, "fast");
            }
        });

        it("should resolve with the value of the first resolved promise - sync second", async () => {
            const promises = [
                createNewPromise((resolve) => setTimeout(() => resolve("slow"), 150)),
                createResolvedPromise("sync"),
                createNewPromise((resolve) => setTimeout(() => resolve("slowest"), 300))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createRacePromise(theIterator);

            const value = await promise;

            assert.equal(value, "sync");

            // Wait for the slowest promise to resolve so that it doesn't cause an unhandled rejection later
            await createTimeoutPromise(200, true);
        });

        it("should reject with the reason of the first rejected promise - sync second", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("slow"), 150)),
                createRejectedPromise("sync"),
                createNewPromise((_, reject) => setTimeout(() => reject("slowest"), 300))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createRacePromise(theIterator);

            try {
                await promise;
            } catch (e) {
                assert.equal(e, "sync");
            }

            // Wait for the slowest promise to resolve so that it doesn't cause an unhandled rejection later
            await createTimeoutPromise(200, true);
        });
    });

    describe("createRacePromise with Iterator", () => {
        it("check create all settled with nothing", async () => {
            let theValues: any[] = [ ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createRacePromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });

        it("check create all settled with some values", async () => {
            let theValues = [ 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createRacePromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });
    });

    describe("createAnyPromise", () => {
        it("should reject if empty array", async () => {
            const promises: Array<any> = [ ];

            const promise = createAnyPromise(promises);

            try {
                await promise;
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.deepEqual(e.errors, [],
                    "Expected the promise to be rejected with the contained exception - " + dumpObj(e));
            }
        });

        it("should resolve with the value of the first fulfilled promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 100)),
                createNewPromise((resolve) => setTimeout(() => resolve("fulfilled"), 50)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 150))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createAnyPromise(theIterator);

            const value = await promise;

            assert.equal(value, "fulfilled");
        });

        it("should resolve with the value of the first fulfilled promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 100)),
                createResolvedPromise(("resolved")),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 150))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createAnyPromise(theIterator);

            const value = await promise;

            assert.equal(value, "resolved");
        });

        it("should reject if all promises are rejected", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected1"), 100)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected2"), 50)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected3"), 150))
            ];

            const theIterator = promises[Symbol.iterator]();
            const promise = createAnyPromise(theIterator);

            try {
                await promise;
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.deepEqual(e.errors, ["rejected1", "rejected2", "rejected3"],
                    "Expected the promise to be rejected with the contained exception - " + dumpObj(e));
            }
        });

        it("array: should resolve with the value of the first fulfilled promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 100)),
                createNewPromise((resolve) => setTimeout(() => resolve("fulfilled"), 50)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 150))
            ];

            const promise = createAnyPromise(promises);

            const value = await promise;

            assert.equal(value, "fulfilled");
        });

        it("array: should resolve with the value of the first fulfilled promise", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 100)),
                createResolvedPromise(("resolved")),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected"), 150))
            ];

            const promise = createAnyPromise(promises);

            const value = await promise;

            assert.equal(value, "resolved");
        });

        it("array: should reject if all promises are rejected", async () => {
            const promises = [
                createNewPromise((_, reject) => setTimeout(() => reject("rejected1"), 100)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected2"), 50)),
                createNewPromise((_, reject) => setTimeout(() => reject("rejected3"), 150))
            ];

            const promise = createAnyPromise(promises);

            try {
                await promise;
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.deepEqual(e.errors, ["rejected1", "rejected2", "rejected3"],
                    "Expected the promise to be rejected with the contained exception - " + dumpObj(e));
            }
        });
    });

    describe("createAnyPromise with Iterator", () => {
        it("check create all settled with nothing", async () => {
            let theValues: any[] = [ ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createAnyPromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });

        it("check create all settled with some values", async () => {
            let theValues = [ 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ];
            let idx = -1
            
            function getNextFn() {
                idx++;
                let isDone = idx >= theValues.length;
                if (!isDone) {
                    // this is passed as the current iterator
                    // so you can directly assign the next "value" that will be returned
                    this.v = theValues[idx];
                }
            
                return isDone;
            }
            
            let theIterator = createIterator<number>({ n: getNextFn });
            try {
                createAnyPromise(theIterator as any);
                assert.fail("Expected an exception to be thrown");
            } catch (e) {
                assert.ok(true, "Caught: " + dumpObj(e));
            }
        });
    });

}
