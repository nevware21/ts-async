/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { isPromiseLike } from "@nevware21/ts-utils";
import { AwaitResponse } from "./interfaces/await-response";
import { IPromise } from "./interfaces/IPromise";
import { FinallyPromiseHandler, RejectedPromiseHandler, ResolvedPromiseHandler } from "./types";

/**
 * Helper to coallesce the promise resolved / reject into a single callback to simplify error handling.
 * @param value - The value or promise like value to wait for
 * @param cb - The callback to call with the response of the promise as an IAwaitResponse object.
 */
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | Promise<T>, cb: (response: AwaitResponse<T>) => void): T | Promise<T | TResult1 | TResult2>;
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | PromiseLike<T>, cb: (response: AwaitResponse<T>) => void): T | PromiseLike<T | TResult1 | TResult2>;
export function doAwaitResponse<T, TResult1 = T, TResult2 = never>(value: T | IPromise<T>, cb: (response: AwaitResponse<T>) => void): T | IPromise<T | TResult1 | TResult2> {
    return doAwait(value as any, (value) => {
        cb && cb({
            value: value,
            rejected: false
        });
    },
    (reason) => {
        cb && cb({
            rejected: true,
            reason: reason
        });
    });
}

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | Promise<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): T | Promise<T | TResult1 | TResult2>;

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | PromiseLike<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): T | PromiseLike<T | TResult1 | TResult2>;

/**
 * Wait for the promise to resolve or reject, if resolved the callback function will be called with it's value and if
 * rejected the rejectFn will be called with the reason. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value.
 * @param value - The value or promise like value to wait for
 * @param resolveFn - The callback to call on the promise successful resolving.
 * @param rejectFn - The callback to call when the promise rejects
 */
export function doAwait<T, TResult1 = T, TResult2 = never>(value: T | IPromise<T>, resolveFn: ResolvedPromiseHandler<T, TResult1>, rejectFn?: RejectedPromiseHandler<TResult2>, finallyFn?: FinallyPromiseHandler): T | IPromise<T | TResult1 | TResult2> {
    let result = value;
    
    if (isPromiseLike<T>(value)) {
        if (resolveFn || rejectFn) {
            result = value.then(resolveFn, rejectFn) as any;
        }
    } else {
        resolveFn && resolveFn(value as T);
    }

    if (finallyFn) {
        result = doFinally(result as any, finallyFn);
    }

    return result as any;
}

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
 * @param value - The value or promise like value to wait for
 * @param finallyFn - The finally function to call once the promise has resolved or rejected
 */
export function doFinally<T>(value: T | Promise<T>, finallyFn: FinallyPromiseHandler): T | Promise<T>;

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
 * @param value - The value or promise like value to wait for
 * @param finallyFn - The finally function to call once the promise has resolved or rejected
 */
export function doFinally<T>(value: T | PromiseLike<T>, finallyFn: FinallyPromiseHandler): T | PromiseLike<T>;

/**
 * Wait for the promise to resolve or reject and then call the finallyFn. If the passed promise argument is not a promise the callback
 * will be called synchronously with the value. If the passed promise doesn't implement finally then a finally implementation will be
 * simulated using then(..., ...).
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