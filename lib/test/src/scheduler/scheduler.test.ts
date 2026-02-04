/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { arrForEach, asString, dumpObj, getGlobal, getLength, isNode, isPromiseLike, isString, isWebWorker, objForEachKey, objHasOwn, scheduleTimeout, setBypassLazyCache } from "@nevware21/ts-utils";
import { PromiseExecutor } from "../../../src/interfaces/types";
import { IPromise } from "../../../src/interfaces/IPromise";
import { createNativePromise, createNativeRejectedPromise } from "../../../src/promise/nativePromise";
import { createAsyncPromise, createAsyncRejectedPromise, createAsyncResolvedPromise } from "../../../src/promise/asyncPromise";
import { createIdlePromise, createIdleRejectedPromise } from "../../../src/promise/idlePromise";
import { createSyncPromise, createSyncRejectedPromise } from "../../../src/promise/syncPromise";
import { PolyPromise } from "../../../src/polyfills/promise";
import { createResolvedPromise, setCreatePromiseImpl } from "../../../src/promise/promise";
import { setPromiseDebugState } from "../../../src/promise/debug";
import { createTaskScheduler } from "../../../src/scheduler/taskScheduler";
import { doAwait, doAwaitResponse } from "../../../src/promise/await";

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

    it("With no promise create function and single task that throws", (done) => {
        let scheduler = createTaskScheduler(null as any);
        assert.equal(true, scheduler.idle, "The scheduler should be idle");

        let waitPromise = scheduler.queue(() => {
            throw 42;
        } );
        assert.ok(isPromiseLike(waitPromise), "We must have got a promise");
        if (checkState) {
            assert.equal(waitPromise.state, "rejected");
        }

        doAwaitResponse(waitPromise, (result) => {
            if (result.rejected) {
                assert.equal(result.reason, 42);
            } else {
                assert.fail("Should have been rejected");
            }

            assert.equal(true, scheduler.idle, "The scheduler should be idle");
            done();
        });
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
                assert.equal(reason.name, "Aborted", dumpObj(reason));
                done();
            });
    });

    it("Check Abort Stale timer", (done) => {
        let scheduler = createTaskScheduler(createAsyncPromise);
        scheduler.setStaleTimeout(50);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 500);
            });
        });

        doAwait(waitPromise1,
            failOnCall,
            (reason) => {
                assert.equal(reason.name, "Aborted", dumpObj(reason));
                done();
            }
        );
    });

    it("Disable Abort Stale timer", (done) => {
        let scheduler = createTaskScheduler(createAsyncPromise);
        scheduler.setStaleTimeout(0);

        let waitPromise1 = scheduler.queue(() => {
            return createNewPromise((resolve) => {
                scheduleTimeout(() => {
                    resolve(42);
                }, 500);
            });
        });

        doAwait(waitPromise1,
            (value) => {
                assert.equal(value, 42, "Check the resolved value");
                done();
            },
            failOnCall
        );
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

            assert.equal(reason.name, "Aborted", dumpObj(reason));
            doAwait(waitPromise2, failOnCall, (reason) => {
                if (checkState) {
                    assert.equal(waitPromise2.state, "rejected");
                }
                assert.equal(reason.name, "Aborted", dumpObj(reason));
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
                assert.equal(reason.name, "Timeout", dumpObj(reason));
                done();
            });
    });

    it("Validate tasks are executed based on when queued correctly", (done) => {
        let scheduler = createTaskScheduler(createAsyncPromise, "queue.test");

        let schedulerName: any = (scheduler as any)["[[SchedulerName]]"];
        let schedulerState: any = (scheduler as any)["[[SchedulerState]]"];

        assert.ok(schedulerName.startsWith("queue.test"), "Scheduled Name should start with 'queue.test' - " + schedulerName);
        assert.deepEqual(schedulerState.r, [], "Scheduler Status - " + JSON.stringify(schedulerState));
        assert.deepEqual(schedulerState.w, [], "Scheduler Status - " + JSON.stringify(schedulerState));

        let order: string[] = [];
        let expectedOrder: Array<string | RegExp> = [
            "queue1",
            "task1",                // Task 1 starts
            "task1.schTimeout",
            "queue2",
            "queue3",
            "queue4",
            "start.wait",
            "task1.resolve",
            "task1.resolved",
            "q1.resolved",
            "task2",                // Task 2 starts
            "task2.schTimeout",
            "queue2.1",
            "task2.resolved",
            "q2.resolved",
            "task3",                // Task 3 starts
            "queue3.1",
            "q3.resolved",
            "task4",                // Task 4 starts
            "queue4.1",
            /q4\.rejected-Timeout: Task \[queue\.test\.[^\-]*\-\(q4\)\] - Running: \d* ms/,

            "task2.1",              // Task 2.1 starts
            "queue2.2",
            /q2\.1\.rejected-Timeout: Task \[queue\.test\.[^\-]*-\(q2.1\)\] - Running: \d* ms/,

            "task3.1",              // Task 3.1 starts
            "q3.1.resolved",
            "task4.1",              // Task 4.1 starts
            "task4.1.schTimeout",
            "queue4.2",
            "task4.1.resolved",     // Task 4.1 completes
            "q4.1.resolved",
            "task2.2",              // Task 2.2 starts
            "task2.2.schTimeout",
            "task2.2.resolve",     // Task 2.2 completes
            "q2.2.resolved",
            "task4.2",              // Task 4.2 starts
            "q4.2.resolved"
        ];
        
        let testWait = createAsyncPromise<void>((onTestComplete) => {
            order.push("queue1");
            scheduler.queue(() => {
                order.push("task1");
                return createAsyncPromise<void>((task1Resolve) => {
                    order.push("task1.schTimeout");
                    scheduleTimeout(() => {
                        order.push("task1.resolve");
                        task1Resolve();
                    }, 20);
                }).then(() => order.push("task1.resolved"), (reason) => order.push("task1.rejected-" + reason));
            }, "q1").then(() => order.push("q1.resolved"));

            order.push("queue2");
            scheduler.queue(() => {
                order.push("task2");
                return createAsyncPromise<void>((task2Resolve) => {
                    order.push("task2.schTimeout");
                    scheduleTimeout(() => {
                        order.push("queue2.1");
                        scheduler.queue(() => {
                            order.push("task2.1");
                            order.push("queue2.2")

                            // Because this is returning the "queue" promise task2.1 will fail to complete within it's 10ms
                            return scheduler.queue<void>(() => {
                                // But task2.2 will still get queued
                                order.push("task2.2");
                                return createAsyncPromise((task22Resolve) => {
                                    order.push("task2.2.schTimeout");
                                    scheduleTimeout(() => {
                                        order.push("task2.2.resolve");
                                        task22Resolve();
                                    }, 1)
                                });
                            }, "q2.2").then(() => order.push("q2.2.resolved"), (reason) => order.push("q2.2.rejected-" + reason));
                        }, "q2.1", 10).then(() => order.push("q2.1.resolved"), (reason) => order.push("q2.1.rejected-" + reason));
                        task2Resolve();
                    }, 1);
                }).then(() => order.push("task2.resolved"), (reason) => order.push("task2.rejected-" + reason));
            }, "q2").then(() => order.push("q2.resolved"), (reason) => order.push("q2.rejected-" + reason));

            order.push("queue3");
            scheduler.queue(() => {
                order.push("task3");
                order.push("queue3.1");
                scheduler.queue(() => {
                    order.push("task3.1");
                    return createAsyncResolvedPromise("task3.1.resolved");
                }, "q3.1").then(() => order.push("q3.1.resolved"), (reason) => order.push("q3.1.rejected-" + reason));
                return createAsyncResolvedPromise("task3.resolved");
            }, "q3", 10).then(() => order.push("q3.resolved"), (reason) => order.push("q3.rejected-" + reason));

            order.push("queue4");
            scheduler.queue(() => {
                order.push("task4");
                order.push("queue4.1");

                // Because this is returning the "queue" promise for 4.1 task4 will fail to complete within its 10ms
                return scheduler.queue(() => {
                    // But Task 4.1 was still "queued"
                    order.push("task4.1");
                    return createAsyncPromise<void>((task41Resolve) => {
                        order.push("task4.1.schTimeout");
                        scheduleTimeout(() => {
                            order.push("queue4.2");

                            // Not returning the promise, so just queue the task
                            scheduler.queue(() => {
                                order.push("task4.2");
                                return createAsyncResolvedPromise("task4.2.resolved");
                            }, "q4.2").then(() => {
                                order.push("q4.2.resolved");
                                onTestComplete();
                            }, (reason) => {
                                order.push("q4.2.rejected-" + reason)
                                onTestComplete();
                            });
                            task41Resolve();
                        }, 1)
                    }).then(() => order.push("task4.1.resolved"), (reason) => order.push("task4.1.rejected-" + reason));
                }, "q4.1").then(() => order.push("q4.1.resolved"), (reason) => order.push("q4.1.rejected-" + reason));
            }, "q4", 10).then(() => order.push("q4.resolved"), (reason) => order.push("q4.rejected-" + reason));
        });

        order.push("start.wait");

        testWait.then(() => {
            assert.equal(order.length, expectedOrder.length, "Check that all of the expected events where scheduled\n" + JSON.stringify(order));
            arrForEach(expectedOrder, (expected, idx) => {
                if (getLength(order) > idx) {
                    if (isString(expected)) {
                        assert.equal(order[idx], expected, expected);
                    } else {
                        assert.ok(expected.test(order[idx]), asString(expected));
                    }
                } else {
                    assert.ok(false, "Missing - " + asString(expected));
                }
            });

            done();
        });
    });
}