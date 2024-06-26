/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The result of a promise. It can either be fulfilled with a value, or rejected with a reason.
 * @since 0.5.0
 * @group Promise
 * @typeParam T - The type of the fulfilled value.
 * @typeParam U - The type of the rejected reason.
 *
 * @example
 * ```ts
 * const result: IPromiseResult<number> = {
 *   status: "fulfilled",
 *   value: 42
 * };
 *
 * const result: IPromiseResult<number> = {
 *   status: "rejected",
 *   reason: "Hello Darkness"
 * };
 * ```
 */
export interface IPromiseResult<T> {
    /**
     * A string indicating whether the promise was fulfilled or rejected
     */
    status: "fulfilled" | "rejected";

    /**
     * The value that the promise was fulfilled with.
     */
    value?: T;

    /**
     * The reason that the promise was rejected with.
     */
    reason?: any;
}
