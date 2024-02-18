/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { getLazy, ICachedValue, ILazyValue } from "@nevware21/ts-utils";
import { _createAllPromise, _createAllSettledPromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "../interfaces/IPromise";
import { createNativePromise } from "./nativePromise";
import { PromiseExecutor } from "../interfaces/types";
import { IPromiseResult } from "../interfaces/IPromiseResult";

let _promiseCreator: ILazyValue<<T>(executor: PromiseExecutor<T>, timeout?: number) => IPromise<T>>;
let _allSettledCreator: ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>>;


/**
 * Set the default promise implementation to use when calling `createPromise`; `createAllPromise`; `createResolvedPromise`
 * and `createRejectedPromise`. This is effective a global value and changing this will affect ALL callers of these
 * functions, as such these functions should only be used when switching implementations would have not unexpected
 * consequences like switching from a `createSyncPromise` to `createIdlePromise` where idle promises have a possibility
 * of never getting called during application shutdown or during an expected timeframe.
 * @group Alias
 * @group Promise
 * @param creator - The creator function to call when a new promise is required.
 */
export function setCreatePromiseImpl(
    creator: <T>(executor: PromiseExecutor<T>, timeout?: number) => IPromise<T>
) {
    _promiseCreator = creator ? getLazy(() => creator) : null;
}

/**
 * Creates a Promise instance using the current default promise creator that when resolved or rejected will execute
 * it's pending chained operations.
 * @group Alias
 * @group Promise
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 * @param timeout - [Optional] timeout to wait before processing the items, defaults to zero.
 */
export function createPromise<T>(executor: PromiseExecutor<T>, timeout?: number): IPromise<T>  {
    !_promiseCreator && (_promiseCreator = getLazy(() => createNativePromise));

    return _promiseCreator.v.call(this, executor, timeout);
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
export const createAllPromise: <T>(input: Iterable<PromiseLike<T>>, timeout?: number) => IPromise<T[]> = /*#__PURE__*/_createAllPromise(createPromise);

/**
 * Returns a single asynchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new asynchronous promise instance.
 * If a new instance is returned then any chained operations will execute __asynchronously__ using the optional
 * timeout value to schedule when the chained items will be executed.(eg. `then()`; `finally()`).
 * @group Alias
 * @group Promise
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createResolvedPromise: <T>(value: T, timeout?: number) => IPromise<T> = /*#__PURE__*/_createResolvedPromise(createPromise);

/**
 * Returns a single asynchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __asynchronously__ using the optional timeout value to schedule
 * when then chained items will be executed. (eg. `catch()`; `finally()`).
 * @group Alias
 * @group Promise
 * @group Rejected
 * @param reason - The rejection reason
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createRejectedPromise: <T = unknown>(reason: any, timeout?: number) => IPromise<T> = /*#__PURE__*/_createRejectedPromise(createPromise);

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the current
 * promise implementation. If the current implementation is synchronous then the chained operations will
 * execute __synchronously__ in the same execution cycle as the final operation pending promises have resolved,
 * or if the input contains no promises. If the current implementation is asynchronous then the chained
 * operations will execute __asynchronously__ using the optional provided timeout value to schedule when the
 * chained items will be executed or if the input contains no promises.
 * It will resolve only after all of the input promises have either resolved or rejected, and will resolve with an array
 * of {@link IPromiseResult } objects that each describe the outcome of each promise.
 * @since 0.5.0
 * @group Alias
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
export function createAllSettledPromise<T>(values: Iterable<T | PromiseLike<T>> | Iterator<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the current
 * promise implementation. If the current implementation is synchronous then the chained operations will
 * execute __synchronously__ in the same execution cycle as the final operation pending promises have resolved,
 * or if the input contains no promises. If the current implementation is asynchronous then the chained
 * operations will execute __asynchronously__ using the optional provided timeout value to schedule when the
 * chained items will be executed or if the input contains no promises.
 * It will resolve only after all of the input promises have either resolved or rejected, and will resolve with an array
 * of {@link IPromiseResult } objects that each describe the outcome of each promise.
 * @since 0.5.0
 * @group Alias
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
export function createAllSettledPromise<T extends readonly unknown[] | []>(input: T, timeout?: number): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
    !_allSettledCreator && (_allSettledCreator = _createAllSettledPromise(createPromise));
    return _allSettledCreator.v(input, timeout);
}