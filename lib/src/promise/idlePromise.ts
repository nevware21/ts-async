/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { ICachedValue, isUndefined } from "@nevware21/ts-utils";
import { _createAllPromise, _createAllSettledPromise, _createPromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "../interfaces/IPromise";
import { idleItemProcessor } from "./itemProcessor";
import { PromiseExecutor } from "../interfaces/types";
import { IPromiseResult } from "../interfaces/IPromiseResult";

let _defaultIdleTimeout:  number;

let _allIdleSettledCreator: ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>>;

/**
 * Sets the global default idle timeout / deadline to use when no timeout is passed during promise creation.
 * @param idleDeadline - Specifies the time in milliseconds to use as the idle timeout / deadline by when any
 * outstanding chained items should be executed.
 * @group Idle
 */
export function setDefaultIdleTimeout(idleDeadline: number) {
    _defaultIdleTimeout = idleDeadline;
}

/**
 * Creates an idle Promise instance that when resolved or rejected will execute it's pending chained operations
 * __asynchronously__ using the `requestIdleCallback` API (if available) with the optional provided timeout value to
 * schedule when the chained items will be executed. When `requestIdleCallback` is not available this becomes the same as
 * `createAsyncPromise` which uses `setTimeout` to schedule executions.
 * @group Idle
 * @group Promise
 * @param executor - The function to be executed during the creation of the promise. Any errors thrown in the executor will
 * cause the promise to be rejected. The return value of the executor is always ignored
 * @param timeout - Optional deadline timeout to wait before processing the items, defaults to undefined. If the number of
 * milliseconds represented by this parameter has elapsed and the callback has not already been called, then a task to execute
 * the callback is queued in the event loop (even if doing so risks causing a negative performance impact). timeout must be a
 * positive value or it is ignored.
 */
export function createIdlePromise<T>(executor: PromiseExecutor<T>, timeout?: number): IPromise<T>  {
    let theTimeout = isUndefined(timeout) ? _defaultIdleTimeout : timeout;
    return _createPromise(createIdlePromise, idleItemProcessor(theTimeout), executor, theTimeout);
}

/**
 * Returns an idle Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations __asynchronously__
 * using the `requestIdleCallback` API (if available) with the optional provided timeout value to
 * schedule when the chained items will be executed.
 * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
 * and will reject with this first rejection message / error.
 * When resolved or rejected any additional chained operations will execute __asynchronously__ using
 * the `requestIdleCallback` API (if available) with the optional provided timeout value to schedule
 * when the chained items will be executed. (eg. `then()`; `catch()`; `finally()`).
 * @group Idle
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
export const createIdleAllPromise: <T>(input: Iterable<PromiseLike<T>>, timeout?: number) => IPromise<T[]> = /*#__PURE__*/_createAllPromise(createIdlePromise);

/**
 * Returns an idle Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new asynchronous promise instance.
 * If a new instance is returned then any chained operations will execute __asynchronously__ using the
 * `requestIdleCallback` API (if available) with the optional provided timeout value to schedule when
 * the chained items will be executed. (eg. `then()`; `finally()`).
 * @group Idle
 * @group Promise
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createIdleResolvedPromise: <T>(value: T, timeout?: number) => IPromise<T> = /*#__PURE__*/_createResolvedPromise(createIdlePromise);

/**
 * Returns an idle Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __asynchronously__ using the o`requestIdleCallback` API
 * (if available) with the optional provided timeout value to schedule when the chained items will
 * be executed. (eg. `catch()`; `finally()`).
 * @group Idle
 * @group Promise
 * @group Rejected
 * @param reason - The rejection reason
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 */
export const createIdleRejectedPromise: <T = unknown>(reason: any, timeout?: number) => IPromise<T> = /*#__PURE__*/_createRejectedPromise(createIdlePromise);

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createIdlePromise idle} promise implementation. Any chained operations will execute
 * __asynchronously__ when the environment is idle as the final operation pending promises have resolved,
 * or if the input contains no promises. It will resolve only after all of the input promises have either
 * resolved or rejected, and will resolve with an array of {@link IPromiseResult } objects that each describe
 * the outcome of each promise.
 * @since 0.5.0
 * @group Idle
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
export function createIdleAllSettledPromise<T>(values: Iterable<T | PromiseLike<T>> | Iterator<T | PromiseLike<T>>, timeout?: number): IPromise<IPromiseResult<Awaited<T>>[]>;

/**
 * Returns a single Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations based on the
 * {@link createIdlePromise idle} promise implementation. Any chained operations will execute
 * __asynchronously__ when the environment is idle as the final operation pending promises have resolved,
 * or if the input contains no promises. It will resolve only after all of the input promises have either
 * resolved or rejected, and will resolve with an array of {@link IPromiseResult } objects that each describe
 * the outcome of each promise.
 * @since 0.5.0
 * @group Idle
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
export function createIdleAllSettledPromise<T extends readonly unknown[] | []>(input: T, timeout?: number): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
    !_allIdleSettledCreator && (_allIdleSettledCreator = _createAllSettledPromise(createIdlePromise));
    return _allIdleSettledCreator.v(input, timeout);
}