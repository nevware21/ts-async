/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { FinallyPromiseHandler, RejectedPromiseHandler, ResolvedPromiseHandler } from "../types";

/**
 * Create a Promise object that represents the eventual completion (or failure) of an asynchronous operation and its resulting value.
 * This interface definition, closely mirrors the typescript / javascript PromiseLike<T> and Promise<T> definitions as well as providing
 * simular functions as that provided by jQuery deferred objects.
 *
 * The returned Promise is a proxy for a value not necessarily known when the promise is created. It allows you to associate handlers
 * with an asynchronous action's eventual success value or failure reason. This lets asynchronous methods return values like synchronous
 * methods: instead of immediately returning the final value, the asynchronous method returns a promise to supply the value at some point
 * in the future.
 *
 * A Promise is in one of these states:
 * <ul>
 * <li> pending: initial state, neither fulfilled nor rejected.
 * <li> fulfilled: meaning that the operation was completed successfully.
 * <li> rejected: meaning that the operation failed.
 * </ul>
 *
 * A pending promise can either be fulfilled with a value or rejected with a reason (error). When either of these options happens, the
 * associated handlers queued up by a promise's then method are called synchronously. If the promise has already been fulfilled or rejected
 * when a corresponding handler is attached, the handler will be called synchronously, so there is no race condition between an asynchronous
 * operation completing and its handlers being attached.
 *
 * As the `then()` and `catch()` methods return promises, they can be chained.
 * @typeParam T - Identifies the expected return type from the promise
 */
export interface IPromise<T> extends PromiseLike<T>, Promise<T> {
      
    /**
     * Returns a string representation of the current state of the promise. The promise can be in one of four states.
     * <ul>
     * <li> <b>"pending"</b>: The promise is not yet in a completed state (neither "rejected"; or "resolved").</li>
     * <li> <b>"resolved"</b>: The promise is in the resolved state.</li>
     * <li> <b>"rejected"</b>: The promise is in the rejected state.</li>
     * </ul>
     * @example
     * ```ts
     * let doResolve;
     * let promise: IPromise<any> = createSyncPromise((resolve) => {
     *  doResolve = resolve;
     * });
     *
     * let state: string = promise.state();
     * console.log("State: " + state);      // State: pending
     * doResolve(true);                     // Promise will resolve synchronously as it's a synchronous promise
     * console.log("State: " + state);      // State: resolved
     * ```
     */
    state?: string;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onResolved The callback to execute when the Promise is resolved.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   resolve('Success!');
     * });
     *
     * promise1.then((value) => {
     *   console.log(value);
     *   // expected output: "Success!"
     * });
     * ```
     */
    then<TResult1 = T, TResult2 = never>(onResolved?: ResolvedPromiseHandler<T, TResult1>, onRejected?: RejectedPromiseHandler<TResult2>): IPromise<TResult1 | TResult2>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onResolved The callback to execute when the Promise is resolved.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   resolve('Success!');
     * });
     *
     * promise1.then((value) => {
     *   console.log(value);
     *   // expected output: "Success!"
     * });
     * ```
     */
    then<TResult1 = T, TResult2 = never>(onResolved?: ResolvedPromiseHandler<T, TResult1>, onRejected?: RejectedPromiseHandler<TResult2>): PromiseLike<TResult1 | TResult2>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onResolved The callback to execute when the Promise is resolved.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   resolve('Success!');
     * });
     *
     * promise1.then((value) => {
     *   console.log(value);
     *   // expected output: "Success!"
     * });
     * ```
     */
     then<TResult1 = T, TResult2 = never>(onResolved?: ResolvedPromiseHandler<T, TResult1>, onRejected?: RejectedPromiseHandler<TResult2>): Promise<TResult1 | TResult2>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   throw 'Uh-oh!';
     * });
     *
     * promise1.catch((error) => {
     *   console.error(error);
     * });
     * // expected output: Uh-oh!
     * ```
     */
    catch<TResult = never>(onRejected?: ((reason: any) => TResult | IPromise<TResult>) | undefined | null): IPromise<T | TResult>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   throw 'Uh-oh!';
     * });
     *
     * promise1.catch((error) => {
     *   console.error(error);
     * });
     * // expected output: Uh-oh!
     * ```
     */
    catch<TResult = never>(onRejected?: ((reason: any) => TResult | IPromise<TResult>) | undefined | null): PromiseLike<T | TResult>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     * @example
     * ```ts
     * const promise1 = createPromise((resolve, reject) => {
     *   throw 'Uh-oh!';
     * });
     *
     * promise1.catch((error) => {
     *   console.error(error);
     * });
     * // expected output: Uh-oh!
     * ```
     */
     catch<TResult = never>(onRejected?: ((reason: any) => TResult | IPromise<TResult>) | undefined | null): Promise<T | TResult>;
 
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     * @example
     * ```ts
     * function doFunction() {
     *   return createPromise((resolve, reject) => {
     *     if (Math.random() > 0.5) {
     *       resolve('Function has completed');
     *     } else {
     *       reject(new Error('Function failed to process'));
     *     }
     *   });
     * }
     *
     * doFunction().then((data) => {
     *     console.log(data);
     * }).catch((err) => {
     *     console.error(err);
     * }).finally(() => {
     *     console.log('Function processing completed');
     * });
     * ```
     */
    finally(onfinally?: FinallyPromiseHandler): IPromise<T>

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     * @example
     * ```ts
     * function doFunction() {
     *   return createPromise((resolve, reject) => {
     *     if (Math.random() > 0.5) {
     *       resolve('Function has completed');
     *     } else {
     *       reject(new Error('Function failed to process'));
     *     }
     *   });
     * }
     *
     * doFunction().then((data) => {
     *     console.log(data);
     * }).catch((err) => {
     *     console.error(err);
     * }).finally(() => {
     *     console.log('Function processing completed');
     * });
     * ```
     */
    finally(onFinally?: FinallyPromiseHandler): Promise<T>;
}
