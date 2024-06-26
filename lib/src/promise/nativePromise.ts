/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createAsyncPromise } from "./asyncPromise";
import { _createAllPromise, _createAllSettledPromise, _createAnyPromise, _createRacePromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "../interfaces/IPromise";
import { ePromiseState, STRING_STATES } from "../internal/state";
import { PromiseExecutor } from "../interfaces/types";
import { dumpObj, isFunction, objDefineProp, throwTypeError, getInst, ICachedValue, createCachedValue, safe } from "@nevware21/ts-utils";
import { STR_PROMISE } from "../internal/constants";
import { IPromiseResult } from "../interfaces/IPromiseResult";

/**
 * @internal
 * @ignore
 * Flag to determine if the native Promise class should be used if available, used for testing purposes.
 */
let _useNative: boolean = true;

/**
 * @internal
 * @ignore
 * Cached value for the native Promise class
 */
let _promiseCls: ICachedValue<PromiseConstructor>;

/**
 * @internal
 * @ignore
 * Cached value for the `Promise.all` method
 */
let _allCreator: ICachedValue<<T>(input: Iterable<T | PromiseLike<T>>, ...additionalArgs: any) => IPromise<Awaited<T>[]>>;

/**
 * @internal
 * @ignore
 * Cached value for the `Promise.allSettled` method
 */
let _allNativeSettledCreator: ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>>;

/**
 * @internal
 * @ignore
 * Cached value for the `Promise.race` method
 */
let _raceNativeCreator: ICachedValue<<T extends readonly unknown[] | []>(values: T, timeout?: number) => IPromise<Awaited<T[number]>>>;

/**
 * @internal
 * @ignore
 * Cached value for the `Promise.any` method
 */
let _anyNativeCreator: ICachedValue<<T extends readonly unknown[] | []>(values: T, timeout?: number) => IPromise<Awaited<T[number]>>>;

/**
 * @internal
 * @ignore
 * Test Hook function to clear the cached values and set whether to use the native Promise class
 * @param useNative
 */
export function _clearPromiseCache(useNative: boolean) {
//#ifdef _DEBUG
    _useNative = !!useNative;
    _promiseCls = null as any;
    _allCreator = null as any;
    _allNativeSettledCreator = null as any;
    _raceNativeCreator = null as any;
    _anyNativeCreator = null as any;
//#endif
}

/*#__NO_SIDE_EFFECTS__*/
export function _createNativePromiseHelper<F>(name: string, func: () => ICachedValue<F>): ICachedValue<F> {
    !_promiseCls && (_promiseCls = createCachedValue<PromiseConstructor>((_useNative && safe(getInst, [STR_PROMISE]).v) || null as any));
    if (_promiseCls.v && _promiseCls.v[name]) {
        return createCachedValue(function<T extends readonly unknown[] | []>(input: T, timeout?: number) {
            return createNativePromise((resolve, reject) => {
                _promiseCls.v[name](input).then(resolve, reject);
            });
        } as F);
    }
    
    return func();
}

/**
 * Creates a Promise instance that when resolved or rejected will execute it's pending chained operations using the
 * available native Promise implementation.
 * If runtime does not support native `Promise` class (or no polyfill is available) this function will fallback to using
 * `createAsyncPromise` which will resolve them __asynchronously__ using the optional provided timeout value to
 * schedule when the chained items will be executed.
 * @group Alias
 * @group Promise
 * @group Native
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export function createNativePromise<T>(executor: PromiseExecutor<T>, timeout?: number): IPromise<T> {
    !_promiseCls && (_promiseCls = createCachedValue<PromiseConstructor>((_useNative && safe(getInst, [STR_PROMISE]).v) || null as any));
    const PrmCls = _promiseCls.v;
    if (!PrmCls) {
        return createAsyncPromise(executor);
    }

    if (!isFunction(executor)) {
        throwTypeError(STR_PROMISE + ": executor is not a function - " + dumpObj(executor));
    }

    let _state = ePromiseState.Pending;

    function _strState() {
        return STRING_STATES[_state];
    }

    let thePromise = new PrmCls<T>((resolve, reject) => {
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
 * @group Promise
 * @group All
 * @group Native
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
export function createNativeAllPromise<T>(input: Iterable<PromiseLike<T>>, timeout?: number): IPromise<T[]> {
    !_allCreator && (_allCreator = _createNativePromiseHelper("all", () => createCachedValue(_createAllPromise(createNativePromise))));
    return _allCreator.v(input, timeout);
}

/**
 * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new asynchronous promise instance.
 * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
 * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
 * @group Alias
 * @group Promise
 * @group Resolved
 * @group Native
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createNativeResolvedPromise: <T>(value: T, timeout?: number) => Promise<T> =  /*#__PURE__*/_createResolvedPromise(createNativePromise);

/**
 * Returns a single asynchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __asynchronously__ using the optional timeout value to schedule
 * when then chained items will be executed. (eg. `catch()`; `finally()`).
 * @group Alias
 * @group Promise
 * @group Rejected
 * @group Native
 * @param reason - The rejection reason
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createNativeRejectedPromise: <T = unknown>(reason: any, timeout?: number) => Promise<T> = /*#__PURE__*/_createRejectedPromise(createNativePromise);

/**
 * Returns a single asynchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations using {@link createNativePromise native}
 * environment promise implementation, if the runtime does not provide any native then the optional provided
 * timeout value will be used to schedule when the chained items will be executed or if the input contains no promises.
 * It will resolve only after all of the input promises have either resolved or rejected, and will resolve with an array
 * of {@link IPromiseResult } objects that each describe the outcome of each promise.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group AllSettled
 * @group Native
 * @param values - The iterator of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
 *
 * @example
 * ```ts
 * const promises = [
 *   createNativeResolvedPromise(1),
 *   createNativeResolvedPromise(2),
 *   createNativeResolvedPromise(3),
 *   createNativeRejectedPromise("error"),
 * ];
 *
 * const results = await createNativeAllSettledPromise(promises);
 *
 * // results is:
 * // [
 * //   { status: "fulfilled", value: 1 },
 * //   { status: "fulfilled", value: 2 },
 * //   { status: "fulfilled", value: 3 },
 * //   { status: "rejected", reason: "error" }
 * // ]
 * ```
 */
export function createNativeAllSettledPromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;

/**
 * Returns a single asynchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations using {@link createNativePromise native}
 * environment promise implementation, if the runtime does not provide any native then the optional provided
 * timeout value will be used to schedule when the chained items will be executed or if the input contains no promises.
 * It will resolve only after all of the input promises have either resolved or rejected, and will resolve with an array
 * of {@link IPromiseResult } objects that each describe the outcome of each promise.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group AllSettled
 * @group Native
 * @param input - An array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
 *
 * @example
 * ```ts
 * const promises = [
 *   createNativeResolvedPromise(1),
 *   createNativeResolvedPromise(2),
 *   createNativeResolvedPromise(3),
 *   createNativeRejectedPromise("error"),
 * ];
 *
 * const results = await createNativeAllSettledPromise(promises);
 *
 * // results is:
 * // [
 * //   { status: "fulfilled", value: 1 },
 * //   { status: "fulfilled", value: 2 },
 * //   { status: "fulfilled", value: 3 },
 * //   { status: "rejected", reason: "error" }
 * // ]
 * ```
 */
export function createNativeAllSettledPromise<T extends readonly unknown[] | []>(input: T, timeout?: number): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
    !_allNativeSettledCreator && (_allNativeSettledCreator = _createNativePromiseHelper("allSettled", () => _createAllSettledPromise(createNativePromise)));
    return _allNativeSettledCreator.v(input, timeout);
}

/**
 * The `createNativeRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
 * settles with the eventual state of the first promise that settles.
 * @description The `createNativeRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
 * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
 * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
 * the first of these values found in the iterable.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group Race
 * @group Native
 * @param values - An iterable object of promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
 * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
 * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise will settle
 * asynchronously.
 */
export function createNativeRacePromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;

/**
 * The `createNativeRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
 * settles with the eventual state of the first promise that settles.
 * @description The `createNativeRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
 * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
 * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
 * the first of these values found in the iterable.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group Race
 * @group Native
 * @param values - An the array of promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
 * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
 * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise will settle
 * asynchronously.
 */
export function  createNativeRacePromise<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>> {
    !_raceNativeCreator && (_raceNativeCreator = _createNativePromiseHelper("race", () => _createRacePromise(createNativePromise)));
    return _raceNativeCreator.v(values, timeout);
}

/**
 * The `createNativeAnyPromise` method takes an iterable of promises as input and returns a single Promise.
 * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
 * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
 * AggregateError containing an array of rejection reasons.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group Any
 * @group Native
 * @param values - An iterable object of promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A new Promise that is:
 * - Already rejected, if the iterable passed is empty.
 * - Asynchronously fulfilled, when any of the promises in the given iterable fulfills. The fulfillment value
 * is the fulfillment value of the first promise that was fulfilled.
 * - Asynchronously rejected, when all of the promises in the given iterable reject. The rejection reason is
 * an AggregateError containing an array of rejection reasons in its errors property. The errors are in the
 * order of the promises passed, regardless of completion order. If the iterable passed is non-empty but
 * contains no pending promises, the returned promise is still asynchronously (instead of synchronously)
 * rejected.
 */
export function createNativeAnyPromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;
        
/**
 * The `createNativeAnyPromise` method takes an array of promises as input and returns a single Promise.
 * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
 * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
 * AggregateError containing an array of rejection reasons.
 * @since 0.5.0
 * @group Alias
 * @group Promise
 * @group Any
 * @group Native
 * @param values - An Array promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A new Promise that is:
 * - Already rejected, if the iterable passed is empty.
 * - Asynchronously fulfilled, when any of the promises in the given iterable fulfills. The fulfillment value
 * is the fulfillment value of the first promise that was fulfilled.
 * - Asynchronously rejected, when all of the promises in the given iterable reject. The rejection reason is
 * an AggregateError containing an array of rejection reasons in its errors property. The errors are in the
 * order of the promises passed, regardless of completion order. If the iterable passed is non-empty but
 * contains no pending promises, the returned promise is still asynchronously (instead of synchronously)
 * rejected.
 */
export function createNativeAnyPromise<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>> {
    !_anyNativeCreator && (_anyNativeCreator = _createNativePromiseHelper("any", () => _createAnyPromise(createNativePromise)));
    return _anyNativeCreator.v(values, timeout);
}
