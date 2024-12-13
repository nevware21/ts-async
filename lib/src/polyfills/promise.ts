/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getKnownSymbol, objDefineProp, WellKnownSymbols } from "@nevware21/ts-utils";
import { createAsyncAllPromise, createAsyncAllSettledPromise, createAsyncAnyPromise, createAsyncPromise, createAsyncRacePromise, createAsyncRejectedPromise, createAsyncResolvedPromise } from "../promise/asyncPromise";
import { IPromise } from "../interfaces/IPromise";
import { PromiseExecutor } from "../interfaces/types";
import { IPromiseResult } from "../interfaces/IPromiseResult";

const toStringTagSymbol: symbol = getKnownSymbol(WellKnownSymbols.toStringTag) as typeof Symbol.toStringTag;

/**
 * The PolyPromiseConstructor interface represents the constructor for the polyfill Promise object.
 * @since 0.5.0
 * @group Polyfill
 */
export interface PolyPromiseConstructor {
    /**
     * Creates a new Promise.
     * @constructor
     * @param executor - A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used to resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    new <T>(executor: PromiseExecutor<T>): IPromise<T>;

    /**
     * Returns a single asynchronous Promise instance that resolves to an array of the results from the input promises.
     * This returned promise will resolve and execute it's pending chained operations __asynchronously__ using the optional
     * provided timeout value to schedule when the chained items will be executed, or if the input contains no promises.
     * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
     * and will reject with this first rejection message / error.
     * When resolved or rejected any additional chained operations will execute __asynchronously__ using the optional
     * timeout value to schedul when the chained item will be executed (eg. `then()`; `catch()`; `finally()`).
     * @group Polyfill
     * @param input - The array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
     * @returns
     * <ul>
     * <li> An already resolved `Promise`, if the input passed is empty.
     * <li> A pending `Promise` in all other cases. This returned promise is then resolved/rejected __synchronously__
     * (as soon as the pending items is empty) when all the promises in the given input have resolved, or if any of the
     * promises reject.
     * </ul>
     */
    all<T>(input: Iterable<PromiseLike<T>>, timeout?: number): IPromise<T[]>;

    /**
     * The `createAsyncRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
     * settles with the eventual state of the first promise that settles.
     * @description The `createAsyncRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
     * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
     * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
     * the first of these values found in the iterable.
     * @since 0.5.0
     * @group Polyfill
     * @param values - An iterable object of promises.
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
     * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
     * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
     * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise is still
     * asynchronously settled.
     */
    race<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;

    /**
     * The `createAsyncRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
     * settles with the eventual state of the first promise that settles.
     * @description The `createAsyncRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
     * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
     * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
     * the first of these values found in the iterable.
     * @since 0.5.0
     * @group Polyfill
     * @param values - An iterable object of promises.
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
     * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
     * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
     * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise is still
     * asynchronously settled.
     */
    race<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>>;

    /**
     * The `createAsyncAnyPromise` method takes an iterable of promises as input and returns a single Promise.
     * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
     * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
     * AggregateError containing an array of rejection reasons.
     * @since 0.5.0
     * @group Polyfill
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
    any<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;
        
    /**
     * The `createAsyncAnyPromise` method takes an iterable of promises as input and returns a single Promise.
     * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
     * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
     * AggregateError containing an array of rejection reasons.
     * @since 0.5.0
     * @group Polyfill
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
    any<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>>;

    /**
     * Returns a single asynchronous Promise instance that is already rejected with the given reason.
     * Any chained operations will execute __asynchronously__ using the optional timeout value to schedule
     * when then chained items will be executed. (eg. `catch()`; `finally()`).
     * @group Polyfill
     * @param reason - The rejection reason
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
     * @returns A rejected promise.
     */
    reject<T = never>(reason?: any, timeout?: number): IPromise<T>;
 
    /**
     * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
     * a promise then that promise is returned instead of creating a new asynchronous promise instance.
     * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
     * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
     * @group Polyfill
     * @returns A resolved promise.
     */
    resolve(): IPromise<void>;
 
    /**
     * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
     * a promise then that promise is returned instead of creating a new asynchronous promise instance.
     * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
     * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
     * @group Polyfill
     * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
     * @returns A resolved promise.
     */
    resolve<T>(value: T | PromiseLike<T>, timeout?: number): IPromise<T>;

    /**
     * Returns a single Promise instance that resolves to an array of the results from the input promises.
     * This returned promise will resolve and execute it's pending chained operations based on the
     * {@link createAsyncPromise | Asynchronous} promise implementation. Any chained operations will execute
     * __asynchronously__  when the final operation pending promises have resolved, or if the input contains
     * no promises. It will resolve only after all of the input promises have either resolved or rejected,
     * and will resolve with an array of {@link IPromiseResult } objects that each describe the outcome of
     * each promise.
     * @since 0.5.0
     * @group Polyfill
     * @param values - An array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
     * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
     */
    allSettled<T extends readonly unknown[] | []>(values: T, timeout?: number): Promise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>;

    /**
     * Returns a single Promise instance that resolves to an array of the results from the input promises.
     * This returned promise will resolve and execute it's pending chained operations based on the
     * {@link createAsyncPromise | Asynchronous} promise implementation. Any chained operations will execute
     * __asynchronously__  when the final operation pending promises have resolved, or if the input contains
     * no promises. It will resolve only after all of the input promises have either resolved or rejected,
     * and will resolve with an array of {@link IPromiseResult } objects that each describe the outcome of
     * each promise.
     * @since 0.5.0
     * @group Polyfill
     * @param values - An array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
     * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
     * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
     */
    allSettled<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;
}

/**
 * A full polyfill for the Promise class.
 * Represents the completion of an asynchronous operation, and its resulting value.
 * @since 0.5.0
 * @class
 * @group Polyfill
 * @group Promise
 */
export let PolyPromise = /*#__PURE__*/(function () {
    /**
     * Creates a new Promise.
     * @constructor
     * @param executor - A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used to resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    function PolyPromiseImpl<T>(executor: PromiseExecutor<T>) {
        this._$ = createAsyncPromise(executor);
        if (toStringTagSymbol) {
            this[toStringTagSymbol] = "Promise";
        }
        // Re-Expose the state of the underlying promise
        objDefineProp(this, "state", {
            get: function() {
                return this._$.state;
            }
        });
    }

    /**
     */
    PolyPromiseImpl.all = createAsyncAllPromise;
    PolyPromiseImpl.race = createAsyncRacePromise;
    PolyPromiseImpl.any = createAsyncAnyPromise;
    PolyPromiseImpl.reject = createAsyncRejectedPromise;
    PolyPromiseImpl.resolve = createAsyncResolvedPromise;
    PolyPromiseImpl.allSettled = createAsyncAllSettledPromise;
    let theProto = PolyPromiseImpl.prototype;
    theProto.then = function (onResolved: any, onRejected: any) {
        return this._$.then(onResolved, onRejected);
    };
    theProto.catch = function (onRejected: any) {
        return this._$.catch(onRejected);
    };
    theProto.finally = function (onfinally: any) {
        return this._$.finally(onfinally);
    };
    return PolyPromiseImpl as unknown as PolyPromiseConstructor;
}());