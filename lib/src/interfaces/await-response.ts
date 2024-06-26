/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * A Simple type which identifies the result of a promise as a single response, it identifies
 * if the promise was rejected or resolved along with the resolved value or rejected reason.
 * It is a union of the `IPromiseFulfilledResult` and `IPromiseRejectedResult` interfaces the
 * response will contain the `rejected` property which will be true if the promise was rejected
 * or false if the promise was resolved. The `status` property will be set to either "fulfilled"
 * or "rejected" to identify the status of the promise. The `value` or `reason` properties will
 * contain the resolved value or rejected reason respectively.
 *
 * @group Promise
 * @typeParam T - The type of the fulfilled value.
 *
 * @example
 * ```ts
 * const result: AwaitResponse<number> = {
 *   status: "fulfilled",
 *   value: 42
 * };
 *
 * const result: AwaitResponse<number> = {
 *   rejected: true,
 *   status: "rejected",
 *   reason: "Hello Darkness"
 * };
 * ```
 */
export interface AwaitResponse<T, R = any> {
    /**
     * A string indicating that the promise was rejected.
     */
    status: "fulfilled" | "rejected";

    /**
     * The value that the promise was fulfilled with.
     */
    value?: T;

    /**
     * The reason that the promise was rejected with.
     */
    reason?: R;

    /**
    * Identifies if the promise was rejected (true) or was resolved (false/undefined)
    */
    rejected?: boolean;
}
