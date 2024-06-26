/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isPromiseLike } from "@nevware21/ts-utils";
import { AwaitResponse } from "../interfaces/await-response";
import { IPromise } from "../interfaces/IPromise";
import { FinallyPromiseHandler, RejectedPromiseHandler, ResolvedPromiseHandler } from "../interfaces/types";
import { REJECTED } from "../internal/constants";

/**
 * Helper to coallesce the promise resolved / reject into a single callback to simplify error handling.
 * @group Await Helper
 * @param value - The value or promise like value to wait
 * @param cb - The callback function to call with the resulting value, if the value is not a
 * promise like value then the callback is called synchronously, if the value is a promise then
 * the callback will be called once the promise completes the resulting value will be passed as an
 * IAwaitResponse instance, it will be called whether any promise resolves or rejects.
 * @returns The value returned by the `cb` callback function, if the value is a promise then the return value
 * of the callback will be returned as a promise whether the callback returns a promise or not.
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via doAwaitResponse
 * doAwaitResponse(promise, (value) => {
 *     if (!value.rejected) {
 *          // Do something with the value
 *     } else {
 *         // Do something with the reason
 *     }
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwaitResponse(42, (value) => {
 *     if (!value.rejected) {
 *         // Do something with the value
 *     } else {
 *        // This will never be true as the value is not a promise
 *     }
 * });
 * ```
 */
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | Promise<T>, cb: (response: AwaitResponse<T | TResult1>) => T | TResult1 | TResult2 | Promise<T | TResult1 | TResult2>): T | TResult1 | TResult2 | Promise<T | TResult1 | TResult2>;

/**
 * Helper to coallesce the promise resolved / reject into a single callback to simplify error handling.
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param cb - The callback function to call with the resulting value, if the value is not a
 * promise like value then the callback is called synchronously, if the value is a promise then
 * the callback will be called once the promise completes the resulting value will be passed as an
 * IAwaitResponse instance, it will be called whether any promise resolves or rejects.
 * @returns The value returned by the `cb` callback function, if the value is a promise then the return value
 * of the callback will be returned as a promise whether the callback returns a promise or not.
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via doAwaitResponse
 * doAwaitResponse(promise, (value) => {
 *     if (!value.rejected) {
 *          // Do something with the value
 *     } else {
 *         // Do something with the reason
 *     }
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwaitResponse(42, (value) => {
 *     if (!value.rejected) {
 *         // Do something with the value
 *     } else {
 *        // This will never be true as the value is not a promise
 *     }
 * });
 * ```
 */
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | PromiseLike<T>, cb: (response: AwaitResponse<T | TResult1>) => T | TResult1 | TResult2 | PromiseLike<T | TResult1 | TResult2>): T | TResult1 | TResult2 | PromiseLike<T | TResult1 | TResult2>;

/**
 * Helper to coallesce the promise resolved / reject into a single callback to simplify error handling.
 * @group Await Helper
 * @param value - The value or promise like value to wait to be resolved or rejected.
 * @param cb - The callback function to call with the resulting value, if the value is not a
 * promise like value then the callback is called synchronously, if the value is a promise then
 * the callback will be called once the promise completes the resulting value will be passed as an
 * IAwaitResponse instance, it will be called whether any promise resolves or rejects.
 * @returns The value returned by the `cb` callback function, if the value is a promise then the return value
 * of the callback will be returned as a promise whether the callback returns a promise or not.
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via doAwaitResponse
 * doAwaitResponse(promise, (value) => {
 *     if (!value.rejected) {
 *          // Do something with the value
 *     } else {
 *         // Do something with the reason
 *     }
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwaitResponse(42, (value) => {
 *     if (!value.rejected) {
 *         // Do something with the value
 *     } else {
 *        // This will never be true as the value is not a promise
 *     }
 * });
 * ```
 */
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | IPromise<T>, cb: (response: AwaitResponse<T | TResult1>) => T | TResult1 | TResult2 | IPromise<T | TResult1 | TResult2>): T | TResult1 | TResult2 | IPromise<T | TResult1 | TResult2> {
    return doAwait(value as T, (value) => {
        return cb ? cb({
            status: "fulfilled",
            rejected: false,
            value: value
        }) : value;
    },
    (reason) => {
        return cb ? cb({
            status: REJECTED,
            rejected: true,
            reason: reason
        }) : reason;
    });
}

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 * @param finallyFn - The callback to call once the promise has resolved or rejected
 * @returns The passed value, if it is a promise and there is either a resolve or reject handler
 * then it will return a chained promise with the value from the resolve or reject handler (depending
 * whether it resolve or rejects)
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via a chained promise
 * let chainedPromise = promise.then((value) => {
 *     // Do something with the value
 * });
 *
 * // Handle via doAwait
 * doAwait(promise, (value) => {
 *     // Do something with the value
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwait(42, (value) => {
 *     // Do something with the value
 * });
 * ```
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | Promise<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): TResult1 | TResult2 | Promise<TResult1 | TResult2>;

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 * @param finallyFn - The callback to call once the promise has resolved or rejected
 * @returns The passed value, if it is a promise and there is either a resolve or reject handler
 * then it will return a chained promise with the value from the resolve or reject handler (depending
 * whether it resolve or rejects)
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via a chained promise
 * let chainedPromise = promise.then((value) => {
 *     // Do something with the value
 * });
 *
 * // Handle via doAwait
 * doAwait(promise, (value) => {
 *     // Do something with the value
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwait(42, (value) => {
 *     // Do something with the value
 * });
 * ```
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | PromiseLike<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): TResult1 | TResult2 | PromiseLike<TResult1 | TResult2>;

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 * @returns The passed value, if it is a promise and there is either a resolve or reject handler
 * then it will return a chained promise with the value from the resolve or reject handler (depending
 * whether it resolve or rejects)
 * @example
 * ```ts
 * let promise = createPromise<number>((resolve, reject) => {
 *     resolve(42);
 * });
 *
 * // Handle via a chained promise
 * let chainedPromise = promise.then((value) => {
 *     // Do something with the value
 * });
 *
 * // Handle via doAwait
 * doAwait(promise, (value) => {
 *     // Do something with the value
 * });
 *
 * // It can also handle the raw value, so you could process the result of either a
 * // synchrounous return of the value or a Promise
 * doAwait(42, (value) => {
 *     // Do something with the value
 * });
 * ```
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | IPromise<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): TResult1 | TResult2 | IPromise<TResult1 | TResult2> {
    let result: T | TResult1 | TResult2 | IPromise<T | TResult1 | TResult2> | PromiseLike<TResult1 | TResult2> = value;
    
    try {
        if (isPromiseLike<T>(value)) {
            if (resolveFn || rejectFn) {
                result = value.then(resolveFn, rejectFn) as any;
            }
        } else {
            try {
                if (resolveFn) {
                    result = resolveFn(value);
                }
            } catch (err) {
                if (rejectFn) {
                    result = rejectFn(err);
                } else {
                    throw err;
                }
            }
        }
    } finally {
        if (finallyFn) {
            doFinally(result as any, finallyFn);
        }
    }

    return result as any;
}

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param finallyFn - The finally function to call once the promise has resolved or rejected
 */
export function doFinally<T>(value: T | Promise<T>, finallyFn: FinallyPromiseHandler): T | Promise<T>;

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param finallyFn - The finally function to call once the promise has resolved or rejected
 */
export function doFinally<T>(value: T | PromiseLike<T>, finallyFn: FinallyPromiseHandler): T | PromiseLike<T>;

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
 * @group Await Helper
 * @param value - The value or promise like value to wait for
 * @param finallyFn - The finally function to call once the promise has resolved or rejected
 */
export function doFinally<T>(value: T | IPromise<T>, finallyFn: FinallyPromiseHandler): T | IPromise<T> {
    let result = value;
    if (finallyFn) {
        if (isPromiseLike<T>(value)) {
            if ((value as IPromise<T>).finally) {
                result = (value as IPromise<T>).finally(finallyFn);
            } else {
                // Simulate finally if not available
                result = value.then(
                    function(value) {
                        finallyFn();
                        return value;
                    }, function(reason: any) {
                        finallyFn();
                        throw reason;
                    });
            }
        } else {
            finallyFn();
        }
    }

    return result;
}