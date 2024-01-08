/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { getLength } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { doWhileAsync } from "./doWhileAsync";
import { IWhileState } from "../interfaces/IWhileState";

/**
 * Calls the provided `callbackFn` function once for each element in an array (or ArratLike) instance in ascending index order. It is not invoked
 * for index properties that have been deleted or are uninitialized. And unlike the ES6 forEach() this supports async functions and you CAN stop
 * or break the iteration  by returning -1 from the `callbackFn` function.
 *
 * The range (number of elements) processed by arrForEach() is set before the first call to the `callbackFn`. Any elements added beyond the range
 * or elements which as assigned to indexes already processed will not be visited by the `callbackFn`.
 *
 * The `callbackFn` may execute `synchronously` or `asynchronously` and if the `callbackFn` returns a `Promise` then the next iteration will not be
 * called until the promise is resolved. If the `callbackFn` returns a `Promise` that is rejected then the iteration will stop and the promise
 * returned by arrForEachAsync will be rejected with the same error.
 * @since 0.5.0
 * @group Loop
 * @group Array
 * @group ArrayLike
 * @typeParam T - Identifies the element type of the array
 * @param theArray - The array or array like object of elements to be searched.
 * @param callbackFn A `asynchronous` or `synchronous` function that accepts up to three arguments. arrForEach calls the callbackfn function one
 * time for each element in the array.
 * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, null or undefined
 * the array will be used as the this value.
 * @remarks
 * arrForEachAsync supports either a `synchronous` or `asynchronous` (returns a `Promise`) callback function. If the callback function returns
 * a `Promise` then the next iteration will not be called until the promise is resolved. If the callback function returns a `Promise` that is
 * rejected then the iteration will stop and the promise returned by arrForEachAsync will be rejected with the same error.
 * @example
 * ```ts
 * const items = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
 * const copyItems = [];
 *
 * arrForEachASync(items, (value, index) => {
 *   copyItems.push(value);
 *   if (index === 5) {
 *     return -1; // Stop the iteration
 *   }
 * });
 * console.log(copyItems); // ['item1', 'item2', 'item3', 'item4', item5']
 *
 * // Also supports input as an array like object
 * const items = { length: 3, 0: 'item1', 1: 'item2', 2: 'item3' };
 *
 * // Asynchronous examples using await
 * const items = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
 * const copyItems = [];
 *
 * await arrForEachASync(items, (value, index) => { // Note: DO NOT use async here unless you use await within the function
 *   if (index < 5) {
 *     // Logs each iteration index
 *     // Logs each value
 *     console.log(value);
 *     // Returning a promise will cause `arrForEachAsync` to return a promise to the caller
 *     // and wait for the promise to resolve before calling the callback function again.
 *     return createTimeoutPromise(10, true);
 *   }
 *
 *   return -1; // Stop the iteration
 * });
 * console.log(copyItems); // ['item1', 'item2', 'item3', 'item4', item5']
 *
 * ```
 */
export function arrForEachAsync<T = any>(theArray: ArrayLike<T>, callbackFn: (value: T, index: number, array: T[]) => void | number | IPromise<void | number>, thisArg?: any): void | number | IPromise<void | number> {
    if (theArray) {
        const len = getLength(theArray);
        if (len) {
            const isDone = (state: IWhileState<void | number>) => {
                if (state.iter >= len || state.res === -1) {
                    return true;
                }
            };

            return doWhileAsync((state) => {
                const idx = state.iter;
                if (idx in theArray) {
                    return callbackFn.call(thisArg || theArray, theArray[idx], idx, theArray);
                }
            }, isDone);
        }
    }
}