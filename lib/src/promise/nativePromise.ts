/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { createAsyncPromise } from "./asyncPromise";
import { _createAllPromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "./interfaces/IPromise";
import { ePromiseState, STRING_STATES } from "../internal/state";
import { PromiseExecutor } from "./types";
import { dumpObj, getInst, getLazy, ILazyValue, isFunction, objDefineProp, throwTypeError } from "@nevware21/ts-utils";

let _isPromiseSupported: ILazyValue<boolean>;

/**
 * Creates a Promise instance that when resolved or rejected will execute it's pending chained operations using the
 * available native Promise implementation.
 * If runtime does not support native `Promise` class (or no polyfill is available) this function will fallback to using
 * `createAsyncPromise` which will resolve them __asynchronously__ using the optional provided timeout value to
 * schedule when the chained items will be ececuted.
 * @group Alias
 * @group Promise
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export function createNativePromise<T>(executor: PromiseExecutor<T>, timeout?: number): IPromise<T> {
    !_isPromiseSupported && (_isPromiseSupported = getLazy(() => !!getInst("Promise")));
    if (!_isPromiseSupported.v) {
        return createAsyncPromise(executor);
    }

    if (!isFunction(executor)) {
        throwTypeError("Promise: executor is not a function - " + dumpObj(executor));
    }

    let _state = ePromiseState.Pending;

    function _strState() {
        return STRING_STATES[_state];
    }

    let thePromise = new Promise<T>((resolve, reject) => {
        function _resolve(value: T) {
            _state = ePromiseState.Resolved;
            resolve(value);
        }

        function _reject(reason: any) {
            _state = ePromiseState.Rejected;
            reject(reason);
        }

        executor(_resolve, _reject);

    }) as IPromise<T>;

    objDefineProp(thePromise, "state", {
        get: _strState
    });

    return thePromise;
}

/**
 * Returns a single asynchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations __asynchronously__ using the optional
 * provided timeout value to schedule when the chained items will be executed, or if the input contains no promises.
 * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
 * and will reject with this first rejection message / error.
 * If the runtime doesn't support the Promise.all it will fallback back to an asynchronous Promise implementation.
 * @group Alias
 * @group All
 * @param input - The array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @param timeout
 * @returns
 * <ul>
 * <li> An already resolved `Promise`, if the input passed is empty.
 * <li> A pending `Promise` in all other cases. This returned promise is then resolved/rejected __synchronously__
 * (as soon as the pending items is empty) when all the promises in the given input have resolved, or if any of the
 * promises reject.
 * </ul>
 */
export const createNativeAllPromise: <T>(input: PromiseLike<T>[], timeout?: number) => IPromise<T[]> = _createAllPromise(createNativePromise);

/**
 * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new asynchronous promise instance.
 * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
 * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
 * @group Async
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createNativeResolvedPromise: <T>(value: T, timeout?: number) => Promise<T> =  _createResolvedPromise(createNativePromise);

/**
 * Returns a single asynchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __asynchronously__ using the optional timeout value to schedule
 * when then chained items will be executed. (eg. `catch()`; `finally()`).
 * @group Async
 * @group Rejected
 * @param reason - The rejection reason
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createNativeRejectedPromise: <T = unknown>(reason: any, timeout?: number) => Promise<T> = _createRejectedPromise(createNativePromise);
