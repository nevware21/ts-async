/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { isFunction, isPromiseLike, utcNow } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { createPromise } from "../promise/promise";
import { doAwait } from "../promise/await";
import { RejectPromiseHandler, ResolvePromiseHandler } from "../interfaces/types";
import { IWhileState } from "../interfaces/IWhileState";

const _doneChk = /*#__PURE__*/<T>(isDone: boolean, state: IWhileState<T>, value: T, thisArg?: any) => {
    let result: boolean | IPromise<boolean> = isDone;
    state.res = value;
    if (!result) {
        if (state.isDone && isFunction(state.isDone)) {
            // Handle synchronous or asynchronous isDone function
            return doAwait(state.isDone.call(thisArg, state), (done) => {
                state.iter++;
                return !!done;
            });
        } else {
            result = !!state.isDone;
        }
    }

    state.iter++;

    return result;
};

/**
 * Performs a while loop, calling the provided `callbackFn` function until the `state.isDone`
 * property is set to `true` or the optional `isDOneFn` returns `true`. The callback function will
 * receive a single {@link IWhileState state} argument and may return either a value or a promise,
 * if a promise is returned the while loop will wait until the promise is resolved before calling
 * the callback function again. If the callback function never returns a promise the while loop
 * will be executed synchronous and last value returned by the callback will be returned, if the
 * callback function returns a promise the while loop will be asynchronous and an {@link IPromise}
 * will be returned and resolved with the last value returned by the callback or rejected if the
 * callback promise rejects or throws an error.
 * @remarks
 * - If an `isDoneFn` is provided the `state.isDone` property will be set to the provided value and
 * is accessible withing the callback function. The callbackFn may overwrite the value of the
 * `state.isDone` property within the callback function with a boolean value or another function that
 * returns a boolean value.
 * - The callback function is called until until the `state.isDone` property is set to `true` or if
 * `state.isDone` is a function until the function returns `true.
 * - The callback function will receive a single {@link IWhileState state} argument that contains
 * the following properties:
 *  - `iter` - The zero-based iteration count, which is incremented after each call to the `callbackFn`
 * and any `isDone` function (if provided), the `iter` property is accessible withing the callback
 * function and may be overwritten within the callback function.
 * - `res` - The last resolved result value returned by the `callbackFn` function.
 * - `isDone` - A boolean value or a callback function that will be called to check if the while loop
 * should stop, the `isDone` property is accessible withing the callback function and may be
 * overwritten within the callback function.
 * - The callback function may return either a value or a promise, if a promise is returned the while
 * loop will wait until the promise is resolved before calling the callback function again.
 * - If the callback function throws an error when executing `synchronously` the exception will
 * also be thrown `synchronously` otherwise the returned promise will be rejected with the error.
 * @since 0.5.0
 * @group Loop
 * @typeParam T - Identifies the element type returned by the callback function.
 * @param callbackFn A function that will be called until the `state.isDone` flag is set to `true`
 * the function will receive a single {@link IWhileState state} argument. The callback function
 * may return either a value or a promise, if a promise is returned the while loop will wait
 * until the promise is resolved before calling the callback function again.
 * @param isDoneFn An optional function that will be called after the callback function is called,
 * that can be used to stop the while loop. The function will receive a single {@link IWhileState state}
 * argument. If the function returns `true` the while loop will stop, otherwise the while loop will continue.
 * @param thisArg An object to which the this keyword can refer in the callbackfn function.
 * If thisArg is omitted, null or undefined the array will be used as the this value.
 * @example
 * ```ts
 * // Synchronous example
 * const result = doWhileAsync((state) => { // Note: DO NOT use async here unless you use await withing the function
 *    if (state.idx < 10) {
 *      // Logs each iteration index (will be called synchronously)
 *      // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *      console.log(state.idx);
 *   } else {
 *     state.isDone = true;
 *     return "Hello";
 *  }
 * });
 *
 * console.log(result); // returns Hello after logging 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *
 * // Synchronous example with isDoneFn
 * const result = doWhileAsync((state) => { // Note: DO NOT use async here unless you use await withing the function
 *    if (state.idx < 10) {
 *      // Logs each iteration index (will be called synchronously)
 *      // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *      console.log(state.idx);
 *   } else {
 *     return "Hello";
 *  }
 * }, (state) => state.idx > 10);
 * console.log(result); // returns Hello after logging 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *
 * // Asynchronous examples
 * const result = await doWhileAsync((state) => { // Note: DO NOT use async here unless you use await withing the function
 *   if (state.idx < 10) {
 *     // Logs each iteration index
 *     // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
 *     console.log(state.idx);
 *     // Returning a promise will cause `doWhileAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before calling the callback function again.
 *     return createTimeoutPromise(10, true, state.idx);
 *   }
 *
 *   state.isDone = true;
 *   return createResolvedPromise("Darkness");
 * });
 * console.log(result); // Darkness
 *
 * // Asynchronous example with isDoneFn
 * const result = await doWhileAsync((state) => { // Note: DO NOT use async here unless you use await withing the function
 *   if (state.idx < 10) {
 *     // Logs each iteration index
 *     // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 calling the callback function synchronously
 *     console.log(state.idx);
 *     // Returning a promise will cause `doWhileAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before calling the callback function again.
 *     return createTimeoutPromise(10, true, state.idx);
 *   }
 *
 *   return createResolvedPromise("Darkness");
 * }, (state) => state.idx > 10);
 * console.log(result); // returns Darkness after logging 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *
 * // Combination Synchronous and Asynchronous example
 * const result = await doWhileAsync((state) => { // Note: DO NOT use async here unless you use await withing the function
 *   if (state.idx < 10) {
 *     // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *     // Logs each iteration index (will be called synchronously)
 *     console.log(state.idx);
 *   } else {
 *     state.isDone = true;
 *     // Returning a promise will cause `doWhileAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before resolving the returned promise.
 *     return createResolvedPromise("my old friend");
 *   }
 * });
 *
 * console.log(result); // my old friend
 *
 * // Asynchronous example using await
 * const result = await doWhileAsync(async (state) => {
 *   if (state.idx < 10) {
 *     // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *     // Logs each iteration index (will be called synchronously)
 *     await createTimeoutPromise(10, true, state.idx);
 *   } else {
 *     state.isDone = true;
 *     // Returning a promise will cause `doWhileAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before resolving the returned promise.
 *     return await createResolvedPromise("my old friend");
 *   }
 * });
 *
 * console.log(result); // my old friend
 *
 * // Asynchronous example using await and dynamically setting the isDone function
 * const result = await doWhileAsync(async (state) => {
 *   // dynamically set the isDone function
 *   if (state.idx < 10) {
 *     state.isDone = () => return false;
 *     // Logs 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 *     // Logs each iteration index (will be called synchronously)
 *     await createTimeoutPromise(10, true, state.idx);
 *   } else {
 *     state.isDone = () => return true;
 *     // Returning a promise will cause `doWhileAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before resolving the returned promise.
 *     return await createResolvedPromise("my old friend");
 *   }
 * });
 *
 * console.log(result); // my old friend
 * ```
 */
export function doWhileAsync<T>(callbackFn: (state: IWhileState<T>) => T | IPromise<T>, isDoneFn?: (state: IWhileState<T>) => boolean | void | IPromise<boolean | void>, thisArg?: any): T | IPromise<T> {
    let promise: T | IPromise<T>;
    let resolve: ResolvePromiseHandler<T>;
    let reject: RejectPromiseHandler | never = (reason: any) => {
        isDone = true;
        throw reason;
    };
    let isDone = false;
    let state: IWhileState<T> = {
        st: utcNow(),
        iter: 0,
        isDone: isDoneFn || false
    };

    if (callbackFn) {
        const _createPromise = (): IPromise<T> => {
            return createPromise<T>((res, rej) => {
                resolve = res;
                reject = rej;
            });
        };

        const _handleAsyncDone = (done: boolean) => {
            isDone = !!done;
            if (!isDone) {
                _processNext();
            } else {
                resolve(state.res);
            }
        };

        const _processNext = (): T | IPromise<T> => {
            // Attempt to process the next item synchronously if possible (for performance -- to reduce the number of promises created)
            while (!isDone) {
                try {
                    let cbResult = callbackFn.call(thisArg, state);
                    if (isPromiseLike(cbResult)) {
                        promise = promise || _createPromise();
                        doAwait(cbResult, (res) => {
                            try {
                                doAwait(_doneChk(isDone, state, res, thisArg), _handleAsyncDone, reject);
                            } catch (e) {
                                reject(e);
                            }
                        }, reject);

                        // Break out of synchronous loop and wait for promise to resolve
                        return promise;
                    } else {
                        let dnRes = _doneChk(isDone, state, cbResult, thisArg);
                        if (isPromiseLike(dnRes)) {
                            promise = promise || _createPromise();
                            doAwait(dnRes, _handleAsyncDone, reject);

                            // Break out of synchronous loop and wait for promise to resolve
                            return promise;
                        } else {
                            isDone = !!dnRes;
                        }
                    }
                } catch (e) {
                    reject(e);
                    return promise;
                }
            }
            
            if (isDone && resolve) {
                resolve(state.res);
            }

            return promise || state.res;
        };
    
        return _processNext();
    }
}