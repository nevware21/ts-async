/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { IPromise } from "./IPromise";

/**
 * A function to be executed during the creation of a promise instance. It receives two functions as parameters: resolve and reject.
 * Any errors thrown in the executor will cause the promise to be rejected, and the return value will be neglected. The semantics of executor are detailed below.
 * @param resolve - The handler function that should be called when the operation has completed and the promise can continue.
 * @param reject - The handler function that should be called to cause the promise to be rejected.
 */
export type PromiseExecutor<T> = (resolve: ResolvePromiseHandler<T>, reject: RejectPromiseHandler) => void;

/**
* This defines the handler function for when a promise is resolved.
* @param value This is the value passed as part of resolving the Promise
* @return This may return a value, another Promise or void. @see {@link IPromise.then} for how the value is handled.
 */
export type ResolvedPromiseHandler<T, TResult1 = T> = (((value: T) => TResult1 | IPromise<TResult1> | PromiseLike<TResult1>) | undefined | null);

/**
* This defines the handler function for when a promise is rejected.
* @param value This is the value passed as part of resolving the Promise
* @return This may return a value, another Promise or void. @see {@link IPromise.then} for how the value is handled.
*/
export type RejectedPromiseHandler<T = never> = (((reason: any) => T | IPromise<T> | PromiseLike<T>) | undefined | null);

/**
 * This defines the handler function that is called via the finally when the promise is resolved or rejected
 */
export type FinallyPromiseHandler = (() => void) | undefined | null;

/**
 * Defines the signature of the resolve function passed to the resolverFunc (in the Promise constructor)
 * @param value The value to resolve the Promise with
 * @returns Nothing
 */
export type ResolvePromiseHandler<T> = (value: T | IPromise<T> | PromiseLike<T>) => void;
 
/**
 * Defines the signature of the reject function passed to the resolverFunc (in the Promise constructor)
 * @param value The value to reject the Promise with
 * @returns Nothing
 */
export type RejectPromiseHandler = (reason?: any) => void;

/**
 * Defines the signature of a function that creates a Promise.
 * @param newExecutor - The executor to run in the context of the promise
 * @param extraArgs - Any extra arguments that can be passed to the creator
 * @returns A Promise `IPromise` implemenetation
 */
export type PromiseCreatorFn = <T, TResult2 = never>(newExecutor: PromiseExecutor<T>, ...extraArgs: any) => IPromise<T | TResult2>;

/**
 * Identifies the function to call to start and execute the task when its
 * ready to be executed.
 * @since 0.2.0
 * @group Scheduler
 * @param taskName - The optional task name that was assigned to this task, it is passed by the task scheduler.
 * @returns The result or a IPromise that will be resolved / rejected when the task
 * was completed.
 * @example
 * ```ts
 * function taskFunc1() {
 *     return 42;
 * }
 *
 * function taskFunc2(taskName: string) {
 *     console.log("Running Task: " + taskName);
 *     return fetch("https://example.com/xxxx").then((response) => {
 *         // ...
 *     });
 * }
 *
 * function taskFunc3() {
 *     return Promise.all([...]);
 * }
 *
 * function taskFunc4() {
 *     return createAllPromise([...]);
 * }
 *
 * function taskFunc5(taskName: string) {
 *     return createPromise(() => {
 *         scheduleTimeout(() => {
 *             console.log("Completing task: " + taskName);
 *             resolve(true);
 *         }, 100);
 *     });
 * }
 * ```
 */
export type StartQueuedTaskFn<T> = (taskName?: string) => T | IPromise<T>;
