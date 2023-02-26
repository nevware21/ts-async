/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { arrForEach, dumpObj, getGlobal, isNode, isPromiseLike, isWebWorker, objForEachKey, objHasOwn, scheduleTimeout, setBypassLazyCache } from "@nevware21/ts-utils";
import { PromiseExecutor } from "../../../src/interfaces/types";
import { IPromise } from "../../../src/interfaces/IPromise";
import { createNativePromise, createNativeRejectedPromise } from "../../../src/promise/nativePromise";
import { createAsyncPromise, createAsyncRejectedPromise } from "../../../src/promise/asyncPromise";
import { createIdlePromise, createIdleRejectedPromise } from "../../../src/promise/idlePromise";
import { createSyncPromise, createSyncRejectedPromise } from "../../../src/promise/syncPromise";
import { PolyPromise } from "../../../src/polyfills/promise";
import { createResolvedPromise, setCreatePromiseImpl } from "../../../src/promise/promise";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { createTaskScheduler } from "../../../src/scheduler/taskScheduler";
import { doAwait } from "../../../src/promise/await";

function failOnCall(value: any) {
    console.error("Failed on being called " + dumpObj(value));
    assert.fail("Should not be executed - " + dumpObj(value));
}

let _unhandledEvents: any[] = [];
function _unhandledrejection(event: any) {
    let prefix = "";
    if (arguments.length > 1) {
        prefix = arguments[1].toString() + " :: ";
    }

    _unhandledEvents.push(prefix + dumpObj(event));
    // console.log("Unhandled Rejection received: " + prefix + dumpObj(event));
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
        _unhandledEvents.push({
            reason,
            promise
        });
        // console.log("Unhandled Node Rejection received: " + (promise.toString() + " :: ") + dumpObj(reason));
    }
}

interface TestDefinition {
    creator: <T>(executor: PromiseExecutor<T>) => IPromise<T>;
    rejected: <T>(reason: any) => IPromise<T>;
    checkState: boolean;
}

type TestImplementations = { [key: string]: TestDefinition };

let testImplementations: TestImplementations = {
    "system": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new Promise<T>(executor);
        },
        rejected: Promise.reject.bind(Promise),
        checkState: false
    },
    "native": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createNativePromise<T>(executor);
        },
        rejected: createNativeRejectedPromise,
        checkState: true
    },
    "async": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createAsyncPromise<T>(executor, 1);
        },
        rejected: createAsyncRejectedPromise,
        checkState: true
    },
    "idle": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createIdlePromise<T>(executor, 1);
        },
        rejected: createIdleRejectedPromise,
        checkState: true
    },
    "sync": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return createSyncPromise<T>(executor);
        },
        rejected: createSyncRejectedPromise,
        checkState: true
    },
    "polyfill": {
        creator: <T>(executor: PromiseExecutor<T>) => {
            return new PolyPromise(executor);
        },
        rejected: PolyPromise.reject,
        checkState: true
    }
}

describe("Validate taskScheduler Usage tests", async () => {
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
    let checkState = definition.checkState;

    beforeEach(() => {
        createNewPromise = definition.creator;
        createRejectedPromise = definition.rejected;
        checkState = definition.checkState;

        _unhandledEvents = [];
        function _debug(id: string, message: string) {
            // console && console.log && console.log("Debug[" + id + "]:" + message);
        }

        setCreatePromiseImpl(definition.creator);
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
            // console.log("Adding Node Rejection Listener");
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
            // console.log("Removing Node Rejection Listener");
            process.off("unhandledRejection", _unhandledNodeRejection);
        }
        
        // Re-Ensable lazy caching
        setBypassLazyCache(false);
    });

    it("With no promise create function or task", (done) => {
        let scheduler = createTaskScheduler(null as any);

        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(null as any);
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise.state, "rejected");
        }

        doAwait(waitPromise, failOnCall,
            (reason) => {
                assert.ok(reason.message.indexOf("is not a function") !== -1, dumpObj(reason));
                assert.equal(true, scheduler.idle, "The scheduler should be idle");
                done();
            });
    });

    it("With no promise create function and single resolved task", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(() => createResolvedPromise(42));
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise.state, testKey === "sync" ? "resolved" : "pending");
        }

        doAwait(waitPromise, (result) => {
            assert.equal(result, 42);
            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        },
        failOnCall);
    });

    it("With no promise create function and single delayed resolved task", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 10);
            });
        });
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        assert.equal(false, scheduler.idle, "The scheduler should not be idle");
        if (checkState) {
            assert.equal(waitPromise.state, "pending");
        }

        doAwait(waitPromise, (result) => {
            assert.equal(result, 42);
            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        },
        failOnCall);
    });

    it("With no promise create function and single rejected task", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(() => createRejectedPromise(42));
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise.state, testKey === "sync" ? "rejected" : "pending");
        }

        doAwait(waitPromise, failOnCall, (result) => {
            assert.equal(result, 42);
            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        });
    });

    it("With no promise create function and single delayed rejected task", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(() => {
            return createNewPromise((resolve, reject) => {
                scheduleTimeout(() => {
                    reject(42);
                }, 10);
            });
        });
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        assert.equal(false, scheduler.idle, "The scheduler should not be idle");

        if (checkState) {
            assert.equal(waitPromise.state, "pending");
        }

        doAwait(waitPromise, failOnCall, (result) => {
            assert.equal(result, 42);
            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        });
    });

    it("With no promise create function and multiple resolved task in reverse order", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 10);
            });
        });
        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        assert.equal(false, scheduler.idle, "The scheduler should not be idle");

        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        let waitPromise2 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(21);
                }, 5);
            });
        });
        assert.ok(isPromiseLike(waitPromise2), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise2.state, "pending");
        }

        doAwait(waitPromise2, (result) => {
            if (checkState) {
                assert.equal(waitPromise1.state, "resolved");
                assert.equal(waitPromise2.state, "resolved");
            }
            assert.equal(result, 21);
            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        }, failOnCall);
    });
    
    it("With no promise create function and multiple resolved task in normal order", (done) => {
        let scheduler = createTaskScheduler(null as any);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 10);
            });
        });
        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        let waitPromise2 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(21);
                }, 5);
            });
        });
        assert.ok(isPromiseLike(waitPromise2), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise2.state, "pending");
        }

        doAwait(waitPromise1, (result) => {
            if (checkState) {
                assert.equal(waitPromise1.state, "resolved");
                assert.equal(waitPromise2.state, "pending");
            }
            assert.equal(result, 42);
            doAwait(waitPromise2, (result) => {
                if (checkState) {
                    assert.equal(waitPromise1.state, "resolved");
                    assert.equal(waitPromise2.state, "resolved");
                }
                assert.equal(result, 21);
                done();
            }, failOnCall);
        }, failOnCall);
    });

    it("Task which synchronously completes after an asynchronous one", (done) => {
        let scheduler = createTaskScheduler(null as any);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 10);
            });
        });
        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        let _task2Started = false;
        let waitPromise2 = scheduler.queue(() => {
            _task2Started = true;
            return 21;
        });
        assert.ok(isPromiseLike(waitPromise2), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise2.state, "pending");
        }

        assert.equal(_task2Started, false, "2nd task should not have executed yet");

        doAwait(waitPromise1, (result) => {
            // Because task 2 is a synchronous execution, it's completed as soon as task 1 resolves
            assert.equal(_task2Started, true, "2nd task should still not have been executed");
            if (checkState) {
                assert.equal(waitPromise1.state, "resolved", "Checking pending 1 state");
                assert.equal(waitPromise2.state, "resolved", "Checking pending 2 state");
            }

            assert.equal(result, 42);

            doAwait(waitPromise2, (result) => {
                if (checkState) {
                    assert.equal(waitPromise1.state, "resolved");
                    assert.equal(waitPromise2.state, "resolved");
                }
                
                assert.equal(_task2Started, true, "2nd task should have been executed and completed");
                assert.equal(result, 21);
                done();
            }, failOnCall);
        }, failOnCall);
    });


    it("Aborting Stale events", (done) => {
        let scheduler = createTaskScheduler(null as any);
        scheduler.setStaleTimeout(200);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 1000);
            });
        });

        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        doAwait(waitPromise1,
            failOnCall,
            (reason) => {
                if (checkState) {
                    assert.equal(waitPromise1.state, "rejected");
                }
                assert.ok(reason.message.indexOf("Aborted") !== -1, dumpObj(reason));
                done();
            });
    });

    it("Aborting Multiple Stale events", (done) => {
        let scheduler = createTaskScheduler(null as any, "AbortMultiple-" + testKey);
        scheduler.setStaleTimeout(100);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    //resolve(42);
                }, 3000);
            });
        }, "waitPromise1");
        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        let waitPromise2 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    //resolve(21);
                }, 3000);
            });
        }, "waitPromise2");
        assert.ok(isPromiseLike(waitPromise2), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise2.state, "pending");
        }

        doAwait(waitPromise1, failOnCall, (reason) => {
            if (checkState) {
                assert.equal(waitPromise1.state, "rejected");
            }

            assert.ok(reason.message.indexOf("Aborted") !== -1, dumpObj(reason));
            doAwait(waitPromise2, failOnCall, (reason) => {
                if (checkState) {
                    assert.equal(waitPromise2.state, "rejected");
                }
                assert.ok(reason.message.indexOf("Aborted") !== -1, dumpObj(reason));
                done();
            });
        });
    });

    it("Task timeout", (done) => {
        let scheduler = createTaskScheduler(null as any);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 1000);
            });
        }, "timeout event", 100);
        assert.ok(isPromiseLike(waitPromise1), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise1.state, "pending");
        }

        doAwait(waitPromise1,
            failOnCall,
            (reason) => {
                if (checkState) {
                    assert.equal(waitPromise1.state, "rejected");
                }
                assert.ok(reason.message.indexOf("Timeout - ") !== -1, dumpObj(reason));
                done();
            });
    });
}