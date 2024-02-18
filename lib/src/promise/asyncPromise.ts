/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { _createAllPromise, _createAllSettledPromise, _createPromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "../interfaces/IPromise";
import { timeoutItemProcessor } from "./itemProcessor";
import { PromiseExecutor } from "../interfaces/types";
import { IPromiseResult } from "../interfaces/IPromiseResult";
import { ICachedValue } from "@nevware21/ts-utils";

let _allAsyncSettledCreator: ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>>;

/**
 * Creates an asynchronous Promise instance that when resolved or rejected will execute it's pending chained operations
 * __asynchronously__ using the optional provided timeout value to schedule when the chained items will be ececuted.
 * @group Async
 * @group Promise
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export function createAsyncPromise<T>(executor: PromiseExecutor<T>, timeout?: number): IPromise<T> {
    return _createPromise(createAsyncPromise, timeoutItemProcessor(timeout), executor, timeout);
}

/**
 * Returns a single asynchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations __asynchronously__ using the optional
 * provided timeout value to schedule when the chained items will be executed, or if the input contains no promises.
 * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
 * and will reject with this first rejection message / error.
 * When resolved or rejected any additional chained operations will execute __asynchronously__ using the optional
 * timeout value to schedul when the chained item will be executed (eg. `then()`; `catch()`; `finally()`).
 * @group Async
 * @group Promise
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
export const createAsyncAllPromise: <T>(input: Iterable<PromiseLike<T>>, timeout?: number) => IPromise<T[]> = /*#__PURE__*/_createAllPromise(createAsyncPromise);

// /**
//  * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved
//  * or rejected.
//  * @param values An array of Promises.
//  * @returns A new Promise.
//  */
//     race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
//export const createAsyncRacePromise: <T extends readonly unknown[] | []>(values: T): IPromise<T[number]>;

/**
 * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new asynchronous promise instance.
 * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
 * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
 * @group Async
 * @group Promise
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createAsyncResolvedPromise: <T>(value: T, timeout?: number) => IPromise<T> = /*#__PURE__*/_createResolvedPromise(createAsyncPromise);

/**
 * Returns a single asynchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __asynchronously__ using the optional timeout value to schedule
 * when then chained items will be executed. (eg. `catch()`; `finally()`).
 * @group Async
 * @group Promise
 * @group Rejected
 * @param reason - The rejection reason
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createAsyncRejectedPromise: <T = unknown>(reason: any, timeout?: number) => IPromise<T> = /*#__PURE__*/_createRejectedPromise(createAsyncPromise);

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createAsyncPromise Aasynchronous} promise implementation. Any chained operations will execute
 * __asynchronously__  when the final operation pending promises have resolved, or if the input contains
 * no promises. It will resolve only after all of the input promises have either resolved or rejected,
 * and will resolve with an array of {@link IPromiseResult } objects that each describe the outcome of
 * each promise.
 * @since 0.5.0
 * @group Async
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
export function createAsyncAllSettledPromise<T>(values: Iterable<T | PromiseLike<T>> | Iterator<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createAsyncPromise Aasynchronous} promise implementation. Any chained operations will execute
 * __asynchronously__  when the final operation pending promises have resolved, or if the input contains
 * no promises. It will resolve only after all of the input promises have either resolved or rejected,
 * and will resolve with an array of {@link IPromiseResult } objects that each describe the outcome of
 * each promise.
 * @since 0.5.0
 * @group Async
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
export function createAsyncAllSettledPromise<T extends readonly unknown[] | []>(input: T, timeout?: number): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
    !_allAsyncSettledCreator && (_allAsyncSettledCreator = _createAllSettledPromise(createAsyncPromise));
    return _allAsyncSettledCreator.v(input, timeout);
}
