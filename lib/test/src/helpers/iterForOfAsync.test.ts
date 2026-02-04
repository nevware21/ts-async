/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { iterForOfAsync } from "../../../src/helpers/iterForOfAsync";
import { CreateIteratorContext, arrSlice, createArrayIterator, createIterator, createRangeIterator, isPromiseLike, objKeys } from "@nevware21/ts-utils";
import { createTimeoutPromise } from "../../../src/promise/timeoutPromise";
import { doAwait } from "../../../src/promise/await";
import { createResolvedPromise } from "../../../src/promise/promise";

describe("Validate iterForOfAsync", () => {
    it ("null iter", () => {
        let result = iterForOfAsync(null as any, (value, index) => {
            assert.fail("Should not be called");
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");
    });

    it ("undefined iter", () => {
        let result = iterForOfAsync(undefined as any, (value, index) => {
            assert.fail("Should not be called");
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");
    });

    it("Synchronous example using an array as the iterator", () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");

        assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, items);
    });

    it("Synchronous example using an array as the iterator limiting length", () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }
        });

        assert.equal(isPromiseLike(result), false, "The interation loop did not return a promise");
        assert.equal(result, -1, "The interation loop was canceled");
        
        assert.equal(copyItems.length, 6, "The interation loop did not iterate over all items");
        assert.deepEqual(copyItems, arrSlice(items, 0, 6));
    });

    it("Synchronous With simple iterable values", () => {
        let cnt = 0;
        iterForOfAsync([], (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterators should have occurred");

        cnt = 0;
        let values: number[] = [];
        iterForOfAsync([1], (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 1, "One iteration should have occurred");
        assert.equal(values[0], 1, "First value should be correct");

        cnt = 0;
        values = [];
        iterForOfAsync([10, 20, 5, 15], (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 4, "4 iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
        assert.equal(values[2], 5);
        assert.equal(values[3], 15);

        cnt = 0;
        let testObj = {};
        iterForOfAsync(objKeys(testObj), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });
        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        testObj = {
            item1: "value1",
            item2: "value2",
            item3: "value3"
        };
        
        let strValues: string[] = [];
        iterForOfAsync(objKeys(testObj), (value) => {
            strValues.push(value);
            cnt++;
        });
        assert.equal(cnt, 3, "3 iterations should have occurred");
        assert.equal(strValues[0], "item1");
        assert.equal(strValues[1], "item2");
        assert.equal(strValues[2], "item3");

        cnt = 0;
        iterForOfAsync({} as any, (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });
        assert.equal(cnt, 0, "No iterations should have occurred");
    });

    it("Synchronous With iterator values", () => {
        let cnt = 0;
        iterForOfAsync(createArrayIterator([]), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        iterForOfAsync(createArrayIterator(null as any), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        iterForOfAsync(createArrayIterator(undefined as any), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        let values: number[] = [];
        iterForOfAsync(createArrayIterator([1]), (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 1, "1 iterations should have occurred");
        assert.equal(values[0], 1, "First value should be correct");

        cnt = 0;
        values = [];
        iterForOfAsync(createArrayIterator([10, 20, 5, 15]), (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 4, "4 iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
        assert.equal(values[2], 5);
        assert.equal(values[3], 15);
    });

    it("ASynchronous example using an array as the iterator using await", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        assert.equal(await result, undefined, "The forEach loop was not canceled");

        assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, items);
    });

    it("ASynchronous example using an array as the iterator using doAwait", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        return doAwait(result, (res) => {
            assert.equal(res, undefined, "The forEach loop was not canceled");

            assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
            assert.deepEqual(copyItems, items);
        });
    });

    it("ASynchronous example using an array as the iterator using await", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }
        });

        assert.equal(isPromiseLike(result), false, "The interation loop did not return a promise");
        assert.equal(await result, -1, "The interation loop was canceled");
        
        assert.equal(copyItems.length, 6, "The interation loop did not iterate over all items");
        assert.deepEqual(copyItems, arrSlice(items, 0, 6));
    });

    it("ASynchronous example using an array as the iterator using doAwait", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = iterForOfAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }
        });

        assert.equal(isPromiseLike(result), false, "The interation loop did not return a promise");
        return doAwait(result, (res) => {
            assert.equal(res, -1, "The interation loop was canceled");
        
            assert.equal(copyItems.length, 6, "The interation loop did not iterate over all items");
            assert.deepEqual(copyItems, arrSlice(items, 0, 6));
        });
    });

    it("ASynchronous With simple iterable values using await", async () => {
        let cnt = 0;
        await iterForOfAsync([], (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterators should have occurred");

        cnt = 0;
        let values: number[] = [];
        await iterForOfAsync([1], (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 1, "One iteration should have occurred");
        assert.equal(values[0], 1, "First value should be correct");

        cnt = 0;
        values = [];
        await iterForOfAsync([10, 20, 5, 15], (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 4, "4 iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
        assert.equal(values[2], 5);
        assert.equal(values[3], 15);

        cnt = 0;
        let testObj = {};
        await iterForOfAsync(objKeys(testObj), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });
        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        testObj = {
            item1: "value1",
            item2: "value2",
            item3: "value3"
        };
        
        let strValues: string[] = [];
        await iterForOfAsync(objKeys(testObj), (value) => {
            strValues.push(value);
            cnt++;
        });
        assert.equal(cnt, 3, "3 iterations should have occurred");
        assert.equal(strValues[0], "item1");
        assert.equal(strValues[1], "item2");
        assert.equal(strValues[2], "item3");

        cnt = 0;
        await iterForOfAsync({} as any, (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });
        assert.equal(cnt, 0, "No iterations should have occurred");
    });

    it("ASynchronous With iterator values using await", async () => {
        let cnt = 0;
        await iterForOfAsync(createArrayIterator([]), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        await iterForOfAsync(createArrayIterator(null as any), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        await iterForOfAsync(createArrayIterator(undefined as any), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        });

        assert.equal(cnt, 0, "No iterations should have occurred");

        cnt = 0;
        let values: number[] = [];
        await iterForOfAsync(createArrayIterator([1]), (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 1, "1 iterations should have occurred");
        assert.equal(values[0], 1, "First value should be correct");

        cnt = 0;
        values = [];
        await iterForOfAsync(createArrayIterator([10, 20, 5, 15]), (value) => {
            cnt++;
            values.push(value);
        });

        assert.equal(cnt, 4, "4 iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
        assert.equal(values[2], 5);
        assert.equal(values[3], 15);
    });

    it("ASynchronous With iterator values using doAwait", async () => {
        let cnt = 0;
        return doAwait(iterForOfAsync(createArrayIterator([]), (value) => {
            assert.ok(false, "There should be no elements")
            cnt++;
        }), (res) => {
            assert.equal(cnt, 0, "No iterations should have occurred");

            cnt = 0;
            return doAwait(iterForOfAsync(createArrayIterator(null as any), (value) => {
                assert.ok(false, "There should be no elements")
                cnt++;
            }), (res) => {
                assert.equal(cnt, 0, "No iterations should have occurred");

                cnt = 0;
                return doAwait(iterForOfAsync(createArrayIterator(undefined as any), (value) => {
                    assert.ok(false, "There should be no elements")
                    cnt++;
                }), (res) => {
                    assert.equal(cnt, 0, "No iterations should have occurred");

                    cnt = 0;
                    let values: number[] = [];
                    return doAwait(iterForOfAsync(createArrayIterator([1]), (value) => {
                        cnt++;
                        values.push(value);
                    }), (res) => {
                        assert.equal(cnt, 1, "1 iterations should have occurred");
                        assert.equal(values[0], 1, "First value should be correct");

                        cnt = 0;
                        values = [];
                        return doAwait(iterForOfAsync(createArrayIterator([10, 20, 5, 15]), (value) => {
                            cnt++;
                            values.push(value);
                        }), (res) => {
                            assert.equal(cnt, 4, "4 iterations should have occurred");
                            assert.equal(values[0], 10);
                            assert.equal(values[1], 20);
                            assert.equal(values[2], 5);
                            assert.equal(values[3], 15);
                        });
                    });
                });
            });
        });
    });

    it("Synchronous stop processing", () => {
        let cnt = 0;
        let values: number[] = [];
        iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                return -1;
            }
        });

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);

        cnt = 0;
        values = [];
        iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                return -1;
            }
        });

        assert.equal(cnt, 2, "No iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
    });

    it("ASynchronous stop processing with await", async () => {
        let cnt = 0;
        let values: number[] = [];
        await iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                return -1;
            }
        });

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);

        cnt = 0;
        values = [];
        await iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                return -1;
            }
        });

        assert.equal(cnt, 2, "No iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
    });

    it("ASynchronous stop processing with doAwait", async () => {
        let cnt = 0;
        let values: number[] = [];
        return doAwait(iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                return -1;
            }
        }), (res) => {
            assert.equal(cnt, 2, "2 iterations should have occurred");
            assert.equal(values[0], 0);
            assert.equal(values[1], 1);

            cnt = 0;
            values = [];
            return doAwait(iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    return -1;
                }
            }), (res) => {
                assert.equal(cnt, 2, "No iterations should have occurred");
                assert.equal(values[0], 10);
                assert.equal(values[1], 20);
            });
        });
    });

    it("Synchronous with error", () => {
        let cnt = 0;
        let values: number[] = [];
        let err = new Error("Test Error");
        try {
            iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);

        cnt = 0;
        values = [];
        err = new Error("Test Error");
        try {
            iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 2, "No iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
    });

    it("Synchronous with error with throw func", () => {
        let cnt = 0;
        let values: number[] = [];
        let err = new Error("Test Error");
        let current = 0;
        let next = 1;
        let done = false;
        let thrown = false;

        let fibCtx: CreateIteratorContext<number> = {
            n: function() {
                fibCtx.v = current;
                current = next;
                next = fibCtx.v + next;

                // Return not done
                return false;
            },
            r: function(value) {
                done = true;
                return value;
            },
            t: function (value) {
                thrown = true;
                return value;
            }
        };

        try {
            iterForOfAsync(createIterator(fibCtx), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);
        assert.equal(done, false, "Done should be false");
        assert.equal(thrown, true, "Thrown should be true");
    });

    it("ASynchronous with error using await", async () => {
        let cnt = 0;
        let values: number[] = [];
        let err = new Error("Test Error");
        try {
            await iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);

        cnt = 0;
        values = [];
        err = new Error("Test Error");
        try {
            await iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 2, "No iterations should have occurred");
        assert.equal(values[0], 10);
        assert.equal(values[1], 20);
    });

    it("ASynchronous with error using doAwait", async () => {
        let cnt = 0;
        let values: number[] = [];
        let err = new Error("Test Error");
        return doAwait(iterForOfAsync(createArrayIterator([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), (value) => {
            cnt++;
            values.push(value);
            if (cnt == 2) {
                throw err;
            }

            return createTimeoutPromise(10, true);
        }), (res) => {
            assert.ok(false, "Should not get here");
        }, (e) => {
            assert.equal(e, err, "Error should be correct");

            assert.equal(cnt, 2, "2 iterations should have occurred");
            assert.equal(values[0], 0);
            assert.equal(values[1], 1);

            cnt = 0;
            values = [];
            err = new Error("Test Error");
            return doAwait(iterForOfAsync(createRangeIterator(10, 2000, 10), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 2) {
                    throw err;
                }

                return createTimeoutPromise(10, true);
            }), (res) => {
                assert.ok(false, "Should not get here");
            }, (e) => {
                assert.equal(e, err, "Error should be correct");

                assert.equal(cnt, 2, "No iterations should have occurred");
                assert.equal(values[0], 10);
                assert.equal(values[1], 20);
            });
        });
    });

    it("ASynchronous with error using await", async () => {
        let cnt = 0;
        let values: number[] = [];
        let err = new Error("Test Error");
        let current = 0;
        let next = 1;
        let done = false;
        let thrown = false;

        let fibCtx: CreateIteratorContext<number> = {
            n: function() {
                fibCtx.v = current;
                current = next;
                next = fibCtx.v + next;

                // Return not done
                return false;
            },
            r: function(value) {
                done = true;
                return value;
            },
            t: function (value) {
                thrown = true;
                return value;
            }
        };

        try {
            await iterForOfAsync(createIterator(fibCtx), (value) => {
                cnt++;
                values.push(value);
                if (cnt == 6) {
                    throw err;
                }
            });
            assert.ok(false, "Should not get here");
        } catch (e) {
            assert.equal(e, err, "Error should be correct");
        }

        assert.equal(cnt, 6, "6 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);
        assert.equal(values[2], 1);
        assert.equal(values[3], 2);
        assert.equal(values[4], 3);
        assert.equal(values[5], 5);
        assert.equal(done, false, "Done should be false");
        assert.equal(thrown, true, "Thrown should be true");
    });

    it("ASynchronous with return fn iterator using await", async () => {
        let cnt = 0;
        let values: number[] = [];
        let current = 0;
        let next = 1;
        let done = false;
        let thrown = false;

        let fibCtx: CreateIteratorContext<number> = {
            n: function() {
                fibCtx.v = current;
                current = next;
                next = fibCtx.v + next;

                // Return not done
                return false;
            },
            r: function(value) {
                done = true;
                return value;
            },
            t: function (value) {
                thrown = true;
                return value;
            }
        };

        await iterForOfAsync(createIterator(fibCtx), (value) => {
            cnt++;
            values.push(value);

            if (cnt == 6) {
                return -1;
            }
        });
        assert.equal(cnt, 6, "6 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);
        assert.equal(values[2], 1);
        assert.equal(values[3], 2);
        assert.equal(values[4], 3);
        assert.equal(values[5], 5);
        assert.equal(done, true, "Done should be true");
        assert.equal(thrown, false, "Thrown should be false");
    });

    it("Using an async generator function", async () => {
        let cnt = 0;
        let values: number[] = [];

        await iterForOfAsync((async function* () {
            yield 0;
            yield 1;
            yield 1;
            yield 2;
            yield 3;
            yield 5;
            yield 8;
            yield 13;
        })(), (value) => {
            cnt++;
            values.push(value);

            if (cnt == 6) {
                return -1;
            }
        });

        assert.equal(cnt, 6, "6 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);
        assert.equal(values[2], 1);
        assert.equal(values[3], 2);
        assert.equal(values[4], 3);
        assert.equal(values[5], 5);
    });

    it ("Using an AsyncIterableIterator", async () => {
        let cnt = 0;
        let values: number[] = [];

        await iterForOfAsync({
            [Symbol.asyncIterator]() {
                return {
                    i: 0,
                    next() {
                        return createResolvedPromise({ value: this.i++, done: false });
                    }
                };
            }
        }, (value) => {
            cnt++;
            values.push(value);

            if (cnt == 2) {
                return -1;
            }
        });

        assert.equal(cnt, 2, "2 iterations should have occurred");
        assert.equal(values[0], 0);
        assert.equal(values[1], 1);
    });
});
