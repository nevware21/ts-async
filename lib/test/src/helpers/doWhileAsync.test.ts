/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { doWhileAsync } from "../../../src/helpers/doWhileAsync";
import { isPromiseLike } from "@nevware21/ts-utils";
import { createResolvedPromise } from "../../../src/promise/promise";
import { createTimeoutPromise } from "../../../src/promise/timeoutPromise";

describe("Validate doAwait", () => {

    it("Validate poassing null does not throw", () => {
        const result = doWhileAsync(null as any, (state) => state.iter < 10);
        assert.equal(isPromiseLike(result), false, "The result should not be a promise");
        assert.equal(result, null, "The result should be null");
    });

    it("Validate poassing undefined does not throw", () => {
        const result = doWhileAsync(undefined as any, (state) => state.iter < 10);
        assert.equal(isPromiseLike(result), false, "The result should not be a promise");
        assert.equal(result, undefined, "The result should be null");
    });

    it("Synchronous example", () => {
        let sequence: number[] = [];
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The iteration value should be '@' + (state.iter - 1)");
            }
            
            if (state.iter < 10) {
                sequence.push(state.iter);
                return "@" + state.iter;
            }

            state.isDone = true;
            return "Hello";
        });
        
        assert.equal(isPromiseLike(result), false, "The result should be a promise");
        assert.equal(result, "Hello", "The result should be 'Hello'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Synchronous example with isDone function", () => {
        let sequence: number[] = [];
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The iteration value should be '@' + (state.iter - 1)");
            }

            if (state.iter < 10) {
                sequence.push(state.iter);
                return "@" + state.iter;
            }

            return "Hello";
        }, (state) => state.iter >= 10);
        
        assert.equal(isPromiseLike(result), false, "The result should be a promise");
        assert.equal(result, "Hello", "The result should be 'Hello'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Synchronous example with lazy isDone function", () => {
        let sequence: number[] = [];
        const result = doWhileAsync((state) => {
            if (!state.isDone) {
                state.isDone = (state) => state.iter >= 10;
            }
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The iteration value should be '@' + (state.iter - 1)");
            }

            if (state.iter < 10) {
                sequence.push(state.iter);
                return "@" + state.iter;
            }
            return "Hello";
        });
        
        assert.equal(isPromiseLike(result), false, "The result should be a promise");
        assert.equal(result, "Hello", "The result should be 'Hello'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Asynchronous example", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                // Returning a promise will cause `doWhileAsync` to return a promise to the caller
                // and wait for the promise to resolve before calling the callback function again.
                return createTimeoutPromise(1, true, "@" + state.iter);
            } else {
                state.isDone = true;
                return createResolvedPromise("Darkness");
            }
        });

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "Darkness", "The result should be 'Darkness'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Asynchronous example with isDone function", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                // Returning a promise will cause `doWhileAsync` to return a promise to the caller
                // and wait for the promise to resolve before calling the callback function again.
                return createTimeoutPromise(1, true, "@" + state.iter);
            }

            return createResolvedPromise("Darkness");
        }, (state) => state.iter >= 10);

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "Darkness", "The result should be 'Darkness'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Asynchronous example with lazy isDone function", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (!state.isDone) {
                state.isDone = (state) => state.iter >= 10;
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                // Returning a promise will cause `doWhileAsync` to return a promise to the caller
                // and wait for the promise to resolve before calling the callback function again.
                return createTimeoutPromise(1, true, "@" + state.iter);
            }

            return createResolvedPromise("Darkness");
        });

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "Darkness", "The result should be 'Darkness'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Combined Synchronous and complete Asynchronously example", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return "@" + state.iter;
            } else {
                state.isDone = true;
                return createResolvedPromise("my old friend");
            }
        });

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "my old friend", "The result should be 'my old friend'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Combined Synchronous and complete Asynchronously example with isDone function", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return "@" + state.iter;
            }

            return createResolvedPromise("my old friend");
        }, (state) => state.iter >= 10);

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "my old friend", "The result should be 'my old friend'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Combined Asynchronous and complete Synchronously example", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return createTimeoutPromise(1, true, "@" + state.iter);
            } else {
                state.isDone = true;
                return "my old friend";
            }
        });

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "my old friend", "The result should be 'my old friend'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Combined Asynchronous and complete Synchronously example with isDone function", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return createTimeoutPromise(1, true, "@" + state.iter);
            }

            return "my old friend";
        }, (state) => state.iter >= 10);

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "my old friend", "The result should be 'my old friend'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });

    it("Asynchronous example using await", async () => {
        let sequence: number[] = [];

        // Asynchronous examples
        const result = doWhileAsync(async (state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The iteration value should be '@' + (state.iter - 1)");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return await createTimeoutPromise(1, true, "@" + state.iter);
            } else {
                state.isDone = true;
                // Returning a promise will cause `doWhileAsync` to return a promise to the caller
                // and wait for the promise to resolve before resolving the returned promise.
                return await createResolvedPromise("my old friend");
            }
        });

        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "my old friend", "The result should be 'my old friend'");
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");
    });
    
    it("should handle synchronous callback errors", () => {
        try {
            doWhileAsync((state) => {
                if (state.iter < 10) {
                    throw new Error("callback error");
                }
            });

            assert.fail("Should have thrown an error");
        } catch (err) {
            assert.equal(err.message, "callback error", "The error message should be \"callback error\"");
        }
    });

    it("should handle callback throwing as async function", async () => {

        const result = doWhileAsync(async (state) => {
            if (state.iter < 10) {
                throw new Error("callback error");
            }
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        try {
            await result;
            assert.fail("Should have thrown an error");
        } catch (err) {
            assert.equal(err.message, "callback error", "The error message should be \"callback error\"");
        }

        // We should have still processed all the items in the sequence
    });

    it("should handle asynchronous callback errors", async () => {
        let sequence: number[] = [];

        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return createTimeoutPromise(1, true, "@" + state.iter);
            } else {
                throw new Error("callback error");
            }
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        try {
            await result;
            assert.fail("Should have thrown an error");
        } catch (err) {
            assert.equal(err.message, "callback error", "The error message should be \"callback error\"");
        }

        // We should have still processed all the items in the sequence
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]");

    });

    it("should handle asynchronous callback errors in the done check function", async () => {
        let sequence: number[] = [];

        const result = doWhileAsync((state) => {
            if (state.iter === 0) {
                assert.equal(state.res, undefined, "The initial value should be undefined");
            } else {
                assert.equal(state.res, "@" + (state.iter - 1), "The initial value should be undefined");
            }

            if (state.iter < 10) {
                // Logs each iteration index
                // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
                sequence.push(state.iter);
                return createTimeoutPromise(1, true, "@" + state.iter);
            }
        }, (state) => {
            if (state.iter > 5) {
                throw new Error("callback error");
            }
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        try {
            await result;
            assert.fail("Should have thrown an error");
        } catch (err) {
            assert.equal(err.message, "callback error", "The error message should be \"callback error\"");
        }

        // We should have still processed all the items in the sequence
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6], "The sequence should be [0, 1, 2, 3, 4, 5, 6]");
    });

    it("Handle synchronous function with an asynchronous done check function", async () => {
        let sequence: number[] = [];

        const result = doWhileAsync((state) => {
            if (state.iter < 10) {
                sequence.push(state.iter);
                return "@" + state.iter;
            }
        }, (state) => {
            if (state.iter > 5) {
                // return true to stop the loop
                return createTimeoutPromise(1, true, true);
            }

            // Just return false to continue
            return createTimeoutPromise(1, true, false);
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "@6", "The result should be true");

        // We should have still processed all the items in the sequence
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6], "The sequence should be [0, 1, 2, 3, 4, 5, 6]");
    });

    it("Handle synchronous function with an asynchronous done check function that throws", async () => {
        let sequence: number[] = [];

        const result = doWhileAsync((state) => {
            if (state.iter < 10) {
                sequence.push(state.iter);
                return "@" + state.iter;
            }
        }, (state) => {
            if (state.iter > 5) {
                throw new Error("done error");
            }

            // Just return false to continue
            return createTimeoutPromise(1, true, false);
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        try {
            await result;
            assert.fail("Should have thrown an error");
        } catch (err) {
            assert.equal(err.message, "done error", "The error message should be \"done error\"");
        }

        // We should have still processed all the items in the sequence
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6], "The sequence should be [0, 1, 2, 3, 4, 5, 6]");
    });

    it("Handle Asynchronous function that sets isDone to true with no done check function", async () => {
        let sequence: number[] = [];

        const result = doWhileAsync(async (state) => {
            
            sequence.push(state.iter);
                
            if (state.iter >= 10) {
                state.isDone = true;
            }

            return createTimeoutPromise(1, true, "@" + state.iter);
        });

        // The result should still be a promise
        assert.equal(isPromiseLike(result), true, "The result should be a promise");
        assert.equal(await result, "@10", "The result should be true");

        // We should have still processed all the items in the sequence
        assert.deepEqual(sequence, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "The sequence should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]");
    });
});

