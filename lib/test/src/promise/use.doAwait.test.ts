/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { arrForEach, dumpObj, getGlobal, isNode, isWebWorker, objForEachKey, objHasOwn, scheduleTimeout, setBypassLazyCache } from "@nevware21/ts-utils";
import { createAsyncPromise, createAsyncRejectedPromise } from "../../../src/promise/asyncPromise";
import { doAwait, doAwaitResponse } from "../../../src/promise/await";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { createIdlePromise, createIdleRejectedPromise } from "../../../src/promise/idlePromise";
import { createNativePromise, createNativeRejectedPromise } from "../../../src/promise/nativePromise";
import { createSyncPromise, createSyncRejectedPromise } from "../../../src/promise/syncPromise";
import { PromiseExecutor } from "../../../src/promise/types";
import { PolyPromise } from "../../../src/polyfills/promise";
import { IPromise } from "../../../src/promise/interfaces/IPromise";

function _expectException(cb: () => void, message: string) {
    try {
        cb();
        assert.ok(false, "expected an exception to be thrown with undefined");
    } catch(e) {
        assert.ok(e.message.indexOf(message) != -1, "Expected the exception message to include [" + message + "] as the reason for failure was [" + e.message + "]");
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

function _fail(reason: any) {
    assert.ok(false, "Unexpected: " + dumpObj(reason));
}

interface TestDefinition {
    creator: <T>(executor: PromiseExecutor<T>) => IPromise<T>;
    rejected: <T>(reason: any) => IPromise<T>;
    checkState: boolean;
    checkChainedState: boolean;
}

type TestImplementations = { [key: string]: TestDefinition };

let testImplementations: TestImplementations = {
    "system": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new Promise<T>(executor);
        },
        rejected: Promise.reject.bind(Promise),
        checkState: false,
        checkChainedState: false
    },
    "native": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createNativePromise<T>(executor);
        },
        rejected: createNativeRejectedPromise,
        checkState: true,
        checkChainedState: false
    },
    "async": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createAsyncPromise<T>(executor, 1);
        },
        rejected: createAsyncRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "idle": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createIdlePromise<T>(executor, 1);
        },
        rejected: createIdleRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "sync": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createSyncPromise<T>(executor);
        },
        rejected: createSyncRejectedPromise,
        checkState: true,
        checkChainedState: true
    },
    "polyfill": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new PolyPromise(executor);
        },
        rejected: PolyPromise.reject,
        checkState: true,
        checkChainedState: true
    }
}

function _log(message: string) {
    if (console && console.log) {
        console.log(message);
    }
}

describe("Validate Promise with doAwait and doAwaitResponse Usage tests", () => {
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
    let checkState = definition.checkState;
    let checkChainedState = definition.checkChainedState;

    beforeEach(() => {
        _unhandledEvents = [];
        function _debug(id: string, message: string) {
            //console && console.log && console.log("Debug[" + id + "]:" + message);
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
        setPromiseDebugState(false);
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
            createNewPromise(<any>"Hello World");
        }, " is not a function");

        _expectException(() => {
            createNewPromise(<any>false);
        }, " is not a function");

        _expectException(() => {
            createNewPromise(<any>true);
        }, " is not a function");
    });

    it("Test resolving promise asynchronously using then/catch with timeout", (done) => {
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
        
        doAwait(chainedPromise, (result) => {
            if (checkState) {
                // The asynchronous promise should be resolved
                assert.equal(promise.state, "resolved");
            }

            if (checkChainedState) {
                // The chained promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "The chained promises are also async promises and have a state");
            }
            assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
            assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
            assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
            done();
        }, _fail);
    });

    it("Test resolving promise asynchronously using then/catch with timeout with finally", (done) => {
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
        
        doAwait(chainedPromise, (result) => {
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
        }, _fail, () => {
            // Make sure the doAwait finally is also called
            assert.equal(finallyCalled, true, "finally should have been executed");
            done();
        });
    });

    it("Test resolving promise asynchronously using then/catch with synchronous executor", (done) => {
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

        doAwait(chainedPromise, (result) => {
            assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
            assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
            assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");

            if (checkChainedState) {
                // The asynchronous promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "Check promise state");
            }

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            done();
        }, _fail);
    });

    it("Test rejecting asynchronous promise using timeout ", (done) => {
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

        doAwaitResponse(chainedPromise, (result) => {

            assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
            assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
            assert.equal(!!result.rejected, false, "The promose should not be rejected")
            assert.equal(result.value, rejectedValue, "Expected the promise to await with the rejected value");

            if (checkState) {
                // The asynchronous promise should be rejected
                assert.equal(promise.state, "rejected", "Check promise state");
            }

            if (checkChainedState) {
                // The asynchronous promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "Check promise state");
            }

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            _log("Complete " + dumpObj(result));
            _log("Complete " + dumpObj(rejectedValue));
            done();
        });
    });
       
    it("Test rejecting promise immediately ", (done) => {

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

        doAwaitResponse(chainedPromise, (result) => {
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
            assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
            assert.equal(result.value, rejectedValue, "Expected the promise to await with the rejected value");
            assert.equal(result.rejected, false, "Expected the result to be a rejected result");
            assert.equal(result.reason, undefined, "The response was handled so the returned result is resolved");

            if (checkState) {
                // The asynchronous promise should be rejected
                assert.equal(promise.state, "rejected", "Check promise state");
            }

            if (checkChainedState) {
                // The asynchronous promise should be resolved
                assert.equal(chainedPromise.state, "resolved", "Check promise state");
            }

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            done();
        });
    });

    it("Test rejecting promise immediately without a reject handler and using await after doAwait", (done) => {

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

        doAwait(chainedPromise, () => {
            assert.fail("Should never get called!");
        }, (reason) => {
            assert.equal(reason, -42, "Validate rejected value - " + dumpObj(reason));
        }, () => {
            if (checkChainedState) {
                // The asynchronous promise should be rejected
                assert.equal(chainedPromise.state, "rejected", "Check promise state");
            }
    
            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            done();
        });
    });

    it("Test rejecting asynchronous promise using timeout with only catch", (done) => {
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

        doAwait(chainedPromise, (result) => {
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
            done();
        }, _fail);
    });
       
    it("Test rejecting promise immediately with only catch", (done) => {

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

        doAwait(chainedPromise, (result) => {
            assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
            assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");
            done();
        }, _fail);
    });

    it("Test rejecting promise by throwing immediately", (done) => {
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

        doAwait(chainedPromise, (result) => {
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
            assert.ok(rejectedValue != null, "Expected the promise to be rejected with a value");
            assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated failure!") != -1, "Expected the promise to be rejected with the contained exception");
            assert.equal(result, rejectedValue, "Expected the promise to await with the rejected value");
            done();
        }, _fail);
    });

    it("Test rejecting promise by throwing with timeout", (done) => {

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
        doAwait(promise, (value) => {
            assert.ok(false, "Terminal resolve then occurred -- it should not");
        }, (reason) => {
            // Try catching unhandled
            terminalError = reason;
            assert.ok(terminalError !== null, "Terminal error thrown and caught");

            assert.equal(executorRun, true, "Expecting the executor should have been run already");
            assert.equal(executorResolved, true, "Expecting the executor should have been run already");
    
            // The promise was still never processed
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
            //assert.equal(result as any, rejectedValue, "Expected the promise to await with the rejected value");
            done();
        });
    });

    it("Test resolving promise with a returned value with timeout", (done) => {
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

        doAwait(chainedPromise, (result) => {
            assert.equal(resolvedValue, 53, "Expected the promise to be resolved with the returned value not the initial resolved value");
            assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
            done();
        }, _fail);
    });

    it("Test resolving promise with a returned value immediately", (done) => {

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
            console.log("Intervening:" + value);
            // Don't return anything
        }).then((value) => {
            console.log("Final:" + value);
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

        doAwait(chainedPromise2, (result) => {
            assert.equal(finalResolve, true, "Expected the final promise to not be resolved yet");
            assert.equal(resolvedValue, undefined, "Expected the promise to be resolved with undefined from the Promise returned by the initial then");
            assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");
            done();
        }, _fail);
    });

    it("Test resolving promise with an asynchronously pre-resolved promise", (done) => {
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

        doAwait(chainedPromise, (result) => {
            assert.equal(resolvedValue, 53, "Expected the promise to be resolved");
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
            assert.equal(result, undefined, "Expected the promise to await with the resolved value");
            done();
        }, _fail);
    });

    it("Test resolving promise with an asynchronously value and then a pre-rejected promise", function (done) {
        let preRejected = Promise.reject(new Error("Simulated Pre Rejected Promise"));

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

        doAwait(chainedPromise, (result) => {
            assert.equal(resolvedValue, null, "Expected the promise to be resolved");
            assert.ok(rejectedValue != null, "Expected the promise to be rejected with a value");
            assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated Pre Rejected Promise") != -1, "Expected the promise to be rejected with the contained exception");
            assert.equal(result as any, resolvedValue, "Expected the promise to await with the resolved value");
            
            // Wait for unhandled rejection event
            doAwait(createNewPromise((resolve) => {
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
                }, 10);
            }), (result) => {
                done();
            }, _fail);
        }, _fail);
    });

    it("Test resolving promise with an asynchronously with an un-resolved promise", (done) => {

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
        doAwait(chainedPromise2, (result) => {
            // The asynchronous promise should be resolved
            assert.equal(executorResolved, true, "The executor has not yet resolved");

            assert.equal(resolvedValue, 68, "Expected the promise to be resolved");
            assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
            assert.equal(result, resolvedValue, "Expected the promise to await with the resolved value");

            done();
        });
    });

    it("check finally handling", async () => {

        assert.equal(await createNewPromise((resolve, reject) => {
            resolve(2);
        }).then(()=> 77), 77, "Expect the result to be 77");

        assert.equal(await createNewPromise((resolve, reject) => {
            resolve(2);
        }).finally(()=> 77), 2, "Expect the result to be 2");
    });
}
