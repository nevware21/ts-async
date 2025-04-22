/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    _createAllPromise, _createAllSettledPromise, _createAnyPromise, _createPromise, _createRacePromise,
    _createRejectedPromise, _createResolvedPromise
} from "./base";
import { IPromise } from "../interfaces/IPromise";
import { syncItemProcessor } from "./itemProcessor";
import { PromiseExecutor } from "../interfaces/types";
import { IPromiseResult } from "../interfaces/IPromiseResult";
import { ICachedValue } from "@nevware21/ts-utils";

let _allSyncSettledCreator: ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>>;
let _raceSyncCreator: ICachedValue<<T extends readonly unknown[] | []>(values: T, timeout?: number) => IPromise<Awaited<T[number]>>>;
let _anySyncCreator: ICachedValue<<T extends readonly unknown[] | []>(values: T, timeout?: number) => IPromise<Awaited<T[number]>>>;

/**
 * Creates a synchronous Promise instance that when resolved or rejected will execute it's pending chained operations
 * __synchronously__ in the same execution cycle as the operation that calls the `executors`, `resolve` or `reject` functions.
 *
 * @group Synchronous
 * @group Promise
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 */
export function createSyncPromise<T>(executor: PromiseExecutor<T>): IPromise<T>  {
    return _createPromise(createSyncPromise, syncItemProcessor, executor);
}

/**
 * Returns a single synchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations __synchronously__ in the same
 * execution cycle as the final operation pending promises have resolved, or if the input contains no promises.
 * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
 * and will reject with this first rejection message / error.
 * When resolved or rejected any additional chained operations will execute __synchronously__ at the point of
 * being added (eg. `then()`; `catch()`; `finally()`).
 *
 * @function
 * @group Synchronous
 * @group Promise
 * @group All
 * @param input - The array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @returns
 * <ul>
 * <li> An already resolved `Promise`, if the input passed is empty.
 * <li> A pending `Promise` in all other cases. This returned promise is then resolved/rejected __synchronously__
 * (as soon as the pending items is empty) when all the promises in the given input have resolved, or if any of the
 * promises reject.
 * </ul>
 */
export const createSyncAllPromise: <T>(input: Iterable<PromiseLike<T>>) => IPromise<T[]> = (/*#__PURE__*/_createAllPromise(createSyncPromise));

/**
 * Returns a single synchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new synchronous promise instance.
 * If a new instance is returned then any chained operations will execute __synchronously__ at the point of being
 * added (calling `then()`).
 *
 * @function
 * @group Synchronous
 * @group Promise
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 */
export const createSyncResolvedPromise: <T>(value: T) => IPromise<T> = (/*#__PURE__*/_createResolvedPromise(createSyncPromise));

/**
 * Returns a single synchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __synchronously__ at the point of being added (eg. `catch()`; `finally()`).
 *
 * @function
 * @group Synchronous
 * @group Promise
 * @group Rejected
 * @param reason - The rejection reason
 */
export const createSyncRejectedPromise: <T = unknown>(reason: any) => IPromise<T> = (/*#__PURE__*/_createRejectedPromise(createSyncPromise));

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createSyncPromise | synchronous} promise implementation. Any chained operations will execute
 * __synchronously__ in the same execution cycle as the final operation pending promises have resolved,
 * or if the input contains no promises. It will resolve only after all of the input promises have either
 * resolved or rejected, and will resolve with an array of {@link IPromiseResult } objects that each describe
 * the outcome of each promise.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group AllSettled
 * @param values - The iterator of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
 *
 * @example
 * ```ts
 * const promises = [
 *   createResolvedPromise(1),
 *   createResolvedPromise(2),
 *   createResolvedPromise(3),
 *   createRejectedPromise("error"),
 * ];
 *
 * const results = await createAllSettledPromise(promises);
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
export function createSyncAllSettledPromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createSyncPromise | synchronous} promise implementation. Any chained operations will execute
 * __synchronously__ in the same execution cycle as the final operation pending promises have resolved,
 * or if the input contains no promises. It will resolve only after all of the input promises have either
 * resolved or rejected, and will resolve with an array of {@link IPromiseResult } objects that each describe
 * the outcome of each promise.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group AllSettled
 * @param input - An array of promises to wait to be resolved / rejected before resolving or rejecting the new promise
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A pending `Promise` that will resolve to an array of {@link IPromiseResult } objects that each describe the outcome of each promise.
 *
 * @example
 * ```ts
 * const promises = [
 *   createResolvedPromise(1),
 *   createResolvedPromise(2),
 *   createResolvedPromise(3),
 *   createRejectedPromise("error"),
 * ];
 *
 * const results = await createAllSettledPromise(promises);
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
export function createSyncAllSettledPromise<T extends readonly unknown[] | []>(input: T, timeout?: number): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
    !_allSyncSettledCreator && (_allSyncSettledCreator = _createAllSettledPromise(createSyncPromise));
    return _allSyncSettledCreator.v(input, timeout);
}

/**
 * The `createSyncRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
 * settles with the eventual state of the first promise that settles.
 * @description The `createSyncRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
 * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
 * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
 * the first of these values found in the iterable.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group Race
 * @param values - An iterable object of promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
 * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
 * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise will settle
 * synchronously.
 */
export function createSyncRacePromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;

/**
 * The `createSyncRacePromise` method takes an array of promises as input and returns a single Promise. This returned promise
 * settles with the eventual state of the first promise that settles.
 * @description The `createSyncRacePromise` method is one of the promise concurrency methods. It's useful when you want the first
 * async task to complete, but do not care about its eventual state (i.e. it can either succeed or fail).
 * If the iterable contains one or more non-promise values and/or an already settled promise, then Promise.race() will settle to
 * the first of these values found in the iterable.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group Race
 * @param values - An the array of promises.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero, only used when Native promises are not available.
 * @returns A Promise that settles with the eventual state of the first promise in the iterable to settle. In other words, it fulfills if the
 * first promise to settle is fulfilled, and rejects if the first promise to settle is rejected. The returned promise remains pending forever
 * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises, the returned promise will settle
 * synchronously.
 */
export function  createSyncRacePromise<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>> {
    !_raceSyncCreator && (_raceSyncCreator = _createRacePromise(createSyncPromise));
    return _raceSyncCreator.v(values, timeout);
}

/**
 * The `createSyncAnyPromise` method takes an iterable of promises as input and returns a single Promise.
 * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
 * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
 * AggregateError containing an array of rejection reasons.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group Any
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
export function createSyncAnyPromise<T>(values: Iterable<T | PromiseLike<T>>, timeout?: number): IPromise<Awaited<T>>;
        
/**
 * The `createSyncAnyPromise` method takes an array of promises as input and returns a single Promise.
 * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment value.
 * It rejects when all of the input's promises reject (including when an empty iterable is passed), with an
 * AggregateError containing an array of rejection reasons.
 * @since 0.5.0
 * @group Synchronous
 * @group Promise
 * @group Any
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
export function createSyncAnyPromise<T extends readonly unknown[] | []>(values: T, timeout?: number): IPromise<Awaited<T[number]>> {
    !_anySyncCreator && (_anySyncCreator = _createAnyPromise(createSyncPromise));
    return _anySyncCreator.v(values, timeout);
}