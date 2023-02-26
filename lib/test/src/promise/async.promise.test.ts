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
import { createAsyncAllPromise, createAsyncPromise, createAsyncRejectedPromise, createAsyncResolvedPromise } from "../../../src/promise/asyncPromise";
import { IPromise } from "../../../src/interfaces/IPromise";
import { setPromiseDebugState } from "../../../src/promise/debug";

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

describe("Validate createAsyncPromise() timeout usages", () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
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
        clock.tick(5000);
        clock.restore();

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
            createAsyncPromise(undefined as any);
        }, "executor is not a function");

        _expectException(() => {
            createAsyncPromise(null as any);
        }, "executor is not a function");
        
        _expectException(() => {
            createAsyncPromise(undefined as any);
        }, "executor is not a function");
    });

    it("Test promise with invalid resolver", () => {
        _expectException(() => {
            createAsyncPromise(<any>"Hello World");
        }, "executor is not a function");

        _expectException(() => {
            createAsyncPromise(<any>false);
        }, "executor is not a function");

        _expectException(() => {
            createAsyncPromise(<any>true);
        }, "executor is not a function");
    });

    it("Test resolving promise via fake clock using then/catch with timeout checking state", () => {
        let resolvedValue: number | null = null;
        let rejectedValue = null;
        let executorRun = false;
        let executorResolved = false;
        let promise = createAsyncPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                resolve(42);
            }, 10);
        }, 10);

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
        }, (value) => {
            rejectedValue = value;
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");

        // The asynchronous promise should be pending
        assert.equal(promise.state, "pending");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");
        assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");

        // Cause the original async promise executior to get resolved
        clock.tick(10);

        // The asynchronous promise should be resolved
        assert.equal(promise.state, "resolved");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have called the resolve");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        
        // The chained promise should still be waiting to get executed
        assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        // The chained promise also inherits the same timeout value from the parent promise
        clock.tick(2);
        assert.equal(resolvedValue, null, "Expected the promise chain to not yet be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");

        clock.tick(2);
        assert.equal(resolvedValue, null, "Expected the promise chain to not yet be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");

        // This should trigger the chained promise
        clock.tick(6);
        // ------------------------------------------------------------------------------------

        assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(chainedPromise.state, "resolved", "The chained promises are also async promises and have a state");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test resolving promise using then/catch synchronously and state", () => {
        let resolvedValue: number | null = null;
        let rejectedValue = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createAsyncPromise<number>((resolve, reject) => {
            executorRun = true;
            resolve(42);
            executorResolved = true;
        }, 10);

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
        });
        
        let catchPromise = chainedPromise.catch((value) => {
            rejectedValue = value;
        });
        
        // The asynchronous promise should be resolved
        assert.equal(promise.state, "resolved");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have called the resolve");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");
        assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");
        
        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise chain to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected yet");

        // The asynchronous promise should be resolved
        assert.equal(promise.state, "resolved");

        // Cause the async promise execution to occur
        clock.tick(9);

        assert.equal(resolvedValue, null, "Expected the promise chain to not yet be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");
        assert.equal(chainedPromise.state, "pending", "The chained promises are also async promises and have a state");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(1);

        assert.equal(chainedPromise.state, "resolved", "The chained promises are also async promises and have a state");
        assert.equal(resolvedValue, 42, "Expected the promise chain to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise chain to not be rejected");

        assert.equal(catchPromise.state, "pending", "The catch chained promise should not yet be resolved");
        clock.tick(10);
        assert.equal(catchPromise.state, "resolved", "The catch chained promise should also now be resolved");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test rejecting promise with timeout and state", () => {
        let resolvedValue: any = null;
        let rejectedValue = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createAsyncPromise<number>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                reject(-42);
            }, 10);
        });

        let chainedPromise = promise.then((value) => {
            resolvedValue = value;
        }, (value) => {
            rejectedValue = value;
        }) as any;

        // The asynchronous promise should be pending
        assert.equal(promise.state, "pending");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have called the resolve");
        
        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");
        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // Cause the async promise execution to occur
        clock.tick(10);

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have called the resolve");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not yet be rejected");

        // The asynchronous promise should be rejected
        assert.equal(promise.state, "rejected");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test rejecting promise synchronously and state", () => {
        let resolvedValue: any = null;
        let rejectedValue = null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createAsyncPromise<number>((resolve, reject) => {
            executorRun = true;
            reject(-42);
            executorResolved = true;
        });

        let chainedPromise = promise.then<any>((value) => {
            resolvedValue = value;
        }).catch((value) => {
            rejectedValue = value;
        });
        
        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have called the resolve");

        // The chained asynchronous promise should be rejected
        assert.equal(promise.state, "rejected");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");

        assert.notEqual(chainedPromise, promise, "Expect that the chained promise is not the same as the original promise");

        // The chained asynchronous promise should be rejected
        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        // The chained asynchronous promise should be rejected
        assert.equal(promise.state, "rejected");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have called the resolve");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved");
        assert.equal(rejectedValue, -42, "Expected the promise to be rejected");
        assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
    });

    it("Test asynchronously resolving promise with a chained promise with a different value", () => {
        let resolvedValue: any= null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createAsyncPromise<any>((resolve, reject) => {
            executorRun = true;
            setTimeout(() => {
                executorResolved = true;
                resolve(42);
            }, 10);
        });

        let chainedPromise = promise.then((value) => {
            return 53;
        }).then((value) => {
            resolvedValue = value;
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have been run already");
        assert.equal(promise.state, "pending", "Check promise state");

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");
        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, false, "Expecting the executor should not have been run already");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");

        // Cause the async promise execution to occur
        clock.tick(10);

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have been run already");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        assert.equal(resolvedValue, 53, "Expected the promise to be resolved with the returned value not the initial resolved value");
    });

    it("Test synchronously resolving promise with a returned value", () => {
        let resolvedValue: any= null;
        let executorRun = false;
        let executorResolved = false;

        let promise = createAsyncPromise<any>((resolve, reject) => {
            executorRun = true;
            resolve(42);
            executorResolved = true;
        });

        let finalResolve = false;
        let chainedPromise = promise.then((value) => {
            //console.log("Intervening:" + value);
            // Don't return anything
        }).then((value) => {
            //console.log("Final:" + value);
            resolvedValue = value;
            finalResolve = true;
        });

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should also have been run already");
        assert.equal(promise.state, "resolved", "Check promise state");

        assert.notEqual(chainedPromise as any, promise, "Expect that the chained promise is not the same as the original promise");
        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have been run already");

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(finalResolve, false, "Expected the final promise to not be resolved yet");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        assert.equal(executorRun, true, "Expecting the executor should have been run already");
        assert.equal(executorResolved, true, "Expecting the executor should have been run already");

        assert.equal(finalResolve, true, "Expected the final promise to be resolved yet");
        assert.equal(resolvedValue, undefined, "Expected the promise to be resolved with undefined from the Promise returned by the initial then");
    });

    it("Test resolving promise with an asynchronously resolved promise", () => {
        let preResolved = createAsyncResolvedPromise(53);
        let preRejected = createAsyncRejectedPromise(new Error("Simulated Pre Rejected Promise"));

        let resolvedValue : number | null= null;
        let rejectedValue: Error | null = null;
        let promise = createAsyncPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        assert.equal(promise.state, "pending", "Check promise state");

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

        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        // Cause the async promise execution to occur
        clock.tick(10);

        assert.equal(resolvedValue, null, "Expected the promise to be resolved but the subsequent promise not to be");
        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        assert.equal(resolvedValue, 53, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        resolvedValue = null;
        rejectedValue = null;
        promise = createAsyncPromise<any>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        assert.equal(promise.state, "pending", "Check promise state");

        chainedPromise = promise.then((value) => {
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

        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        // Cause the async promise execution to occur
        clock.tick(10);

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // ------------------------------------------------------------------------------------
        // Simulating the chained execution via the timeouts
        // This would normally be via await chainedPromise;
        // ------------------------------------------------------------------------------------
        clock.tick(10);

        assert.equal(resolvedValue, null, "Expected the promise to be resolved");
        assert.ok(rejectedValue != null, "Expected the promise to be rejected with a value");
        assert.ok(rejectedValue && rejectedValue.message.indexOf("Simulated Pre Rejected Promise") != -1, "Expected the promise to be rejected with the contained exception");

        let executorResolved = false;
        let unresolvedPromise = createAsyncPromise((resolve, reject) => {
            setTimeout(() => {
                executorResolved = true;
                resolve(68);
            }, 2000);
        });
        resolvedValue = null;
        rejectedValue = null;
        promise = createAsyncPromise<number>((resolve, reject) => {
            setTimeout(() => {
                resolve(42);
            }, 10);
        });
        
        assert.equal(promise.state, "pending", "Check promise state");

        chainedPromise = promise.then((value) => {
            return unresolvedPromise;
        }).then((value) => {
            resolvedValue = value as any;
        },
        (value) => {
            rejectedValue = value;
        });

        // Should not be resolved or rejected yet as this should happen asynchronously
        assert.equal(executorResolved, false, "The executor has not yet resolved");
        assert.equal(chainedPromise.state, "pending", "Check chained promises state");

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // Cause the async promise execution to occur, but not enough for the unresolved promise
        clock.tick(100);

        assert.equal(executorResolved, false, "The executor has not yet resolved");
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // let some more time pass but still not enough for the unresolved promise
        clock.tick(900);

        assert.equal(executorResolved, false, "The executor has not yet resolved");
        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");

        // Now lets trigger the unresolved promise
        clock.tick(1000);

        // The asynchronous promise should be resolved
        assert.equal(executorResolved, true, "The executor has not yet resolved");

        // We need to call await to let the "real" new JS execution cycle to occur
        // ------------------------------------------------------------------------------------
        // Simulating await via the timeouts
        //await chainedPromise;
        clock.tick(10);

        assert.equal(resolvedValue, 68, "Expected the promise to be resolved");
        assert.equal(rejectedValue, null, "Expected the promise to not be rejected yet");
    });

    it("Test waiting for multiple promises", () => {
        let thePromises: IPromise<any>[] = [];
        let isResolved: boolean[] = [];
        let resolvedValue:any = null;

        // Create the promises
        for (let lp = 0; lp < 10; lp++) {
            isResolved[lp] = false;
            thePromises[lp] = createAsyncPromise((resolve, reject) => {
                scheduleTimeout(() => {
                    // Wait to resolve this promise
                    isResolved[lp] = true;
                    resolve(lp);
                }, (lp + 1) * 1000);
            })
        }

        // Create the uber waiting promise
        let thePromise: IPromise<any> = createAsyncAllPromise(thePromises);
        thePromise.then((value) => {
            resolvedValue = value;
        });

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");

        for (let lp = 0; lp < 10; lp++) {
            clock.tick(100);
            assert.equal(isResolved[lp], false, "Worker not resolved yet");
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet - " + lp);
            clock.tick(899);
            assert.equal(isResolved[lp], false, "Worker not resolved yet");
            assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet - " + lp);
            // This will cause the worker promise to get resolved
            clock.tick(1);
            assert.equal(isResolved[lp], true, "Worker now resolved");
        }

        assert.equal(resolvedValue, null, "Expected the promise to not be resolved yet");
        clock.tick(50);
        assert.ok(resolvedValue != null, "Expected the promise to be resolved");
        for (let lp = 0; lp < 10; lp++) {
            assert.equal(resolvedValue[lp], lp, "Value mismatch");
        }
    });

    describe("Validate unhandled rejection event handling", () => {

        it("Test pre-rejected promise with no handler", () => {
            clock.tick(1000);
            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            let preRejected = createAsyncRejectedPromise(new Error("Simulated Pre Rejected Promise"));
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");

            for (let lp = 0; lp < 9; lp++) {
                clock.tick(1);
                assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            }

            // This bumps over the unhandled rejecting limit and should cause the event to be emitted
            clock.tick(1);
            assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
        });

        it("Test pre-rejected promise with with only a resolved handler", () => {

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            let preRejected = createAsyncRejectedPromise(new Error("Simulated Pre Rejected Promise"));
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");

            let resolvedCalled = false;
            let handled = preRejected.then(() => {
                resolvedCalled = true;
            });

            assert.equal(handled.state, "pending", "The handling promise should be pending");
            assert.equal(resolvedCalled, false, "Resolved handler should not have been called");

            for (let lp = 0; lp < 9; lp++) {
                clock.tick(1);
                assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            }

            // This bumps over the unhandled rejecting limit and should cause the event to be emitted
            clock.tick(1);
            assert.equal(resolvedCalled, false, "Resolved handler should not have been called");
            assert.equal(handled.state, "rejected", "The handling promise should be rejected");
            assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
        });

        it("Test pre-rejected promise with with only a reject handler", () => {

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            let preRejected = createAsyncRejectedPromise(new Error("Simulated Pre Rejected Promise"));
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");

            let catchCalled = false;
            let handled = preRejected.catch(() => {
                catchCalled = true;
            });

            assert.equal(handled.state, "pending", "The handling promise should be pending");
            assert.equal(catchCalled, false, "Catch handler should not have been called");

            for (let lp = 0; lp < 9; lp++) {
                clock.tick(1);
                assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            }

            // This bumps over the unhandled rejecting limit and should cause the event to be emitted
            clock.tick(1);
            assert.equal(catchCalled, true, "Catch handler should have been called");
            assert.equal(handled.state, "resolved", "The handling promise should be resolved");
            assert.equal(_unhandledEvents.length, 0, "Unhandled rejection should have been emitted");
        });

        it("Test pre-rejected promise with with only a finally handler", () => {

            assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            let preRejected = createAsyncRejectedPromise(new Error("Simulated Pre Rejected Promise"));
            assert.equal(preRejected.state, "rejected", "The promise should be rejected");

            let finallyCalled = false;
            let handled = preRejected.finally(() => {
                finallyCalled = true;
            });

            assert.equal(handled.state, "pending", "The handling promise should be pending");
            assert.equal(finallyCalled, false, "Finally handler should not have been called");

            for (let lp = 0; lp < 9; lp++) {
                clock.tick(1);
                assert.equal(_unhandledEvents.length, 0, "No unhandled rejections");
            }

            // This bumps over the unhandled rejecting limit and should cause the event to be emitted
            clock.tick(1);
            assert.equal(finallyCalled, true, "Finally handler should have been called");
            assert.equal(handled.state, "rejected", "The handling promise should be rejected");
            assert.equal(_unhandledEvents.length, 1, "Unhandled rejection should have been emitted - " + dumpObj(_unhandledEvents));
        });
    });
});
