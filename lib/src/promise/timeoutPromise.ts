/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { isUndefined, scheduleTimeout } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { createPromise } from "./promise";

/**
 * Creates a Promise instance that resolve or reject after the specified timeout.
 * @since 0.5.0
 * @group Timeout
 * @group Promise
 * @param timeout - The timeout in milliseconds to wait before resolving or rejecting the promise.
 * @param resolveReject - [Optional] If true the promise will resolve, otherwise it will reject.
 * @param message - [Optional] The message to use when rejecting the promise, if not supplied (or
 * undefined) the default message will be used.
 * @returns A promise that will resolve or reject after the specified timeout.
 * @example
 * ```ts
 * // Rejects after 100ms with default message
 * const result = await createTimeoutPromise(100);
 * // Throws an Error: Timeout of 100ms exceeded
 *
 * // Resolves after 100ms with default message
 * const result = await createTimeoutPromise(100, true);
 * console.log(result); // Timeout of 100ms exceeded
 *
 * // Rejects after 100ms with default message
 * const result = await createTimeoutPromise(100, false);
 * // throws an Error: Timeout of 100ms exceeded
 *
 * // Resolves after 100ms with default message
 * const result = await createTimeoutPromise(100, true);
 * console.log(result); // Timeout of 100ms exceeded
 *
 * // Rejects after 100ms with the message "Hello"
 * const result = await createTimeoutPromise(100, false, "Hello");
 * // throws an Error: Hello
 *
 * // Resolves after 100ms with the message "Hello"
 * const result = await createTimeoutPromise(100, true, "Hello");
 * console.log(result); // Hello
 *
 * // Resolves after 100ms with the message "Hello"
 * doAwait(createTimeoutPromise(100, true, "Hello"), (result) => {
 *  console.log(result); // Hello
 * });
 *
 * // Rejects after 100ms with the message "Hello"
 * doAwait(createTimeoutPromise(100, false, "Hello"), (result) => {
 *   // Not called
 * }, (err) => {
 *   console.log(err); // Hello
 * });
 *
 * // Rejects after 100ms with the message "Hello"
 * doAwaitResult(createTimeoutPromise(100, false, "Hello"), (result) => {
 *   console.log(result.rejected); // true
 *   console.log(result.reason); // Hello
 * });
 * ```
 */
export function createTimeoutPromise<T = any>(timeout: number, resolveReject?: boolean, message?: T): IPromise<T> {
    return createPromise((resolve, reject) => {
        scheduleTimeout(() => {
            (resolveReject ? resolve : reject)(!isUndefined(message) ? message : "Timeout of " + timeout + "ms exceeded" as T);
        }, timeout);
    });
}
