/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue, WellKnownSymbols, createCachedValue, fnCall, getKnownSymbol, isIterator, isPromiseLike } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { doWhileAsync } from "./doWhileAsync";
import { IWhileState } from "../interfaces/IWhileState";
import { DONE, RETURN, VALUE } from "../internal/constants";
import { doAwait, doFinally } from "../promise/await";

let _iterSymbol: ICachedValue<symbol>;
let _iterAsyncSymbol: ICachedValue<symbol>;

/**
 * Calls the provided `callbackFn` function once for each element in the iterator or iterator returned by
 * the iterable and processed in the same order as returned by the iterator. As with the {@link arrForEachAsync}
 * you CAN stop or break the iteration by returning -1 from the `callbackFn` function.
 *
 * The order of processing is not reset if you add or remove elemenets to the iterator, the actual behavior will
 * depend on the iterator implementation.
 *
 * if the passed `iter` is both an Iterable\<T\> and Iterator\<T\> the Iterator\<T\> interface takes precedence. And if
 * an iterable and does not have a `Symbol.iterator` property then the `iter` will be used as the iterator.
 *
 * The `callbackFn` may execute `synchronously` or `asynchronously` and if the `callbackFn` returns a `Promise`
 * then the next iteration will not be called until the promise is resolved. If the `callbackFn` returns a `Promise`
 * that is rejected then the iteration will stop and the promise returned by iterForEachAsync will be rejected with
 * the same error.
 * @remarks
 * If Symbols are NOT supported then the iterable MUST be using the same polyFill for the well know symbols, as used
 * by the library. If the iterable is using a different polyFill then the `iter` MUST be an Iterator\<T\> and not an
 * Iterable\<T\>.
 * If you are targetting a mixed environment you SHOULD either
 * - only use the polyfill Symbol's provided by this library
 * - ensure that you add any symbol polyfills BEFORE these utilities
 * iterForOfAsync
 * @since 0.5.0
 * @group Loop
 * @group Iterator
 * @typeParam T - Identifies the element type of the iterator
 * @param iter - The iterator or iterable of elements to be searched.
 * @param callbackFn - A `asynchronous` or `synchronous` function that accepts up to three arguments. iterForEach
 * calls the callbackfn function one time for each element in the iterator.
 * @param thisArg - An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted,
 * null or undefined the iterator will be used as the this value.
 * @example
 * ```ts
 * const items = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
 * const copyItems = [];
 *
 * // using async / await
 * let result = await iterForOfAsync(items, async (value, index) => {
 *   copyItems.push(value);
 *   if (index === 5) {
 *     return -1; // Stop the iteration
 *   }
 *
 *   await createTimeoutPromise(100); // Wait 100ms before processing the next item, you could also just return the promise
 *  })
 *
 * console.log(result); // returns -1 if the loop was stopped, otherwise returns undefined
 *
 * // using doAwait
 * doAwait(iterForOfAsync(items, (value, index) => {
 *   copyItems.push(value);
 *   if (index === 5) {
 *     return -1; // Stop the iteration
 *   }
 *
 *   return createTimeoutPromise(100); // Wait 100ms before processing the next item, you could also just return the promise
 *  }), (result) => {
 *    console.log(result); // returns -1 if the loop was stopped, otherwise returns undefined
 *  });
 * ```
 */
export function iterForOfAsync<T = any>(iter: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T>, callbackFn: (value: T, count: number, iter?: Iterator<T> | AsyncIterator<T>) => void | number | IPromise<void | number>, thisArg?: any): void | number | IPromise<void | number> {
    let err: { e: any };
    let iterResult: IteratorResult<T>;
    let theIter: AsyncIterator<T> | Iterator<T> = iter as AsyncIterator<T> | Iterator<T>;

    function onFailed(failed: any): never  {
        err = { e: failed };
        if (theIter.throw) {
            iterResult = null;
            theIter.throw(err);
        }

        throw failed;
    }

    function onFinally() {
        try {
            if (iterResult && !iterResult[DONE]) {
                theIter[RETURN] && theIter[RETURN](iterResult);
            }
        } finally {
            if (err) {
                // eslint-disable-next-line no-unsafe-finally
                throw err.e;
            }
        }
    }

    if (iter) {
        if (!isIterator(iter)) {
            // Get the asyncIterator from the iterable
            !_iterAsyncSymbol && (_iterAsyncSymbol = createCachedValue(getKnownSymbol(WellKnownSymbols.asyncIterator)));
            theIter = (iter as any)[_iterAsyncSymbol.v] ? (iter as any)[_iterAsyncSymbol.v]() : null;
            if (!theIter) {
                // Get the iterator from the iterable
                !_iterSymbol && (_iterSymbol = createCachedValue(getKnownSymbol(WellKnownSymbols.iterator)));
                theIter = (iter as any)[_iterSymbol.v] ? (iter as any)[_iterSymbol.v]() : null;
            }
        }
        
        if (theIter && isIterator(theIter)) {

            let result: void | number | IPromise<void | number>;
            try {
                result = doWhileAsync((state) => {
                    return doAwait(theIter.next(), (res) => {
                        iterResult = res;
                        if (!res[DONE]) {
                            return fnCall(callbackFn, thisArg || theIter, iterResult[VALUE], state.iter, theIter);
                        }
                    }, (reason) => {
                        state.isDone = true;
                        onFailed(reason);
                    });
                }, (state: IWhileState<void | number>) => {
                    if (!iterResult || iterResult[DONE] || state.res === -1) {
                        onFinally();
                        return true;
                    }
                }, thisArg || theIter);

                if (isPromiseLike(result)) {
                    result = doFinally(result.catch(onFailed), onFinally);
                }

                return result;
            } catch (failed) {
                onFailed(failed);
            } finally {
                if (result && !isPromiseLike(result)) {
                    onFinally();
                }
            }
        }
    }
}