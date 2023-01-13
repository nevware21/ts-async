/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { _createAllPromise, _createPromise, _createRejectedPromise, _createResolvedPromise } from "./base";
import { IPromise } from "./interfaces/IPromise";
import { syncItemProcessor } from "./itemProcessor";
import { PromiseExecutor } from "./types";

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
    return _createPromise(createSyncPromise, syncItemProcessor(), executor);
}

/**
 * Returns a single synchronous Promise instance that resolves to an array of the results from the input promises.
 * This returned promise will resolve and execute it's pending chained operations __synchronously__ in the same
 * execution cycle as the final operation pending promises have resolved, or if the input contains no promises.
 * It rejects immediately upon any of the input promises rejected or non-promises throwing an error,
 * and will reject with this first rejection message / error.
 * When resolved or rejected any additional chained operations will execute __synchronously__ at the point of
 * being added (eg. `then()`; `catch()`; `finally()`).
 * @group Synchronous
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
export const createSyncAllPromise: <T>(input: PromiseLike<T>[]) => IPromise<T[]> = _createAllPromise(createSyncPromise);

/**
 * Returns a single synchronous Promise instance that is already resolved with the given value. If the value passed is
 * a promise then that promise is returned instead of creating a new synchronous promise instance.
 * If a new instance is returned then any chained operations will execute __synchronously__ at the point of being
 * added (calling `then()`).
 * @group Synchronous
 * @group Resolved
 * @param value - The value to be used by this `Promise`. Can also be a `Promise` or a thenable to resolve.
 */
export const createSyncResolvedPromise: <T>(value: T) => IPromise<T> = _createResolvedPromise(createSyncPromise);

/**
 * Returns a single synchronous Promise instance that is already rejected with the given reason.
 * Any chained operations will execute __synchronously__ at the point of being added (eg. `catch()`; `finally()`).
 * @group Synchronous
 * @group Rejected
 * @param reason - The rejection reason
 */
export const createSyncRejectedPromise: <T = unknown>(reason: any) => IPromise<T> = _createRejectedPromise(createSyncPromise);
