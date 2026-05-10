/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrSlice, dumpObj, getKnownSymbol, hasSymbol, isFunction, isPromiseLike, isUndefined,
    throwTypeError, WellKnownSymbols, objToString, scheduleTimeout, ITimerHandler, getWindow, isNode,
    getGlobal, objDefine, objDefineProp, iterForOf, isIterable, isArray, arrForEach, createCachedValue,
    ICachedValue, safe, getInst, createCustomError
} from "@nevware21/ts-utils";
import { doAwait, doAwaitResponse } from "./await";
import { _addDebugState, _promiseDebugEnabled } from "./debug";
import { IPromise } from "../interfaces/IPromise";
import { PromisePendingProcessor } from "./itemProcessor";
import {
    FinallyPromiseHandler, PromiseCreatorFn, PromiseExecutor, RejectedPromiseHandler, ResolvedPromiseHandler
} from "../interfaces/types";
import { ePromiseState, STRING_STATES } from "../internal/state";
import { emitEvent } from "./event";
import { REJECTED, STR_PROMISE } from "../internal/constants";
import { IPromiseResult } from "../interfaces/IPromiseResult";

//#ifdef DEBUG
//#:(!DEBUG) import { _debugLog } from "./debug";
//#endif

const NODE_UNHANDLED_REJECTION = "unhandledRejection";
const UNHANDLED_REJECTION = NODE_UNHANDLED_REJECTION.toLowerCase();

let _currentPromiseId: number[] = [];
let _uniquePromiseId = 0;
let _unhandledRejectionTimeout = 10;
let _aggregationError: ICachedValue<any>;

/**
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/PromiseRejectionEvent)
 */
interface _PromiseRejectionEvent extends Event {
    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/PromiseRejectionEvent/promise)
     */
    readonly promise: IPromise<any>;

    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/PromiseRejectionEvent/reason)
     */
    readonly reason: any;
}

let _hasPromiseRejectionEvent: ICachedValue<_PromiseRejectionEvent>;

function dumpFnObj(value: any) {
    if (isFunction(value)) {
        return value.toString();
    }

    return dumpObj(value);
}

//#ifdef DEBUG
//#:(!DEBUG) function _getCaller(prefix: string, start: number) {
//#:(!DEBUG)     let stack = new Error().stack;
//#:(!DEBUG)     if (stack) {
//#:(!DEBUG)         let lines = stack.split("\n");
//#:(!DEBUG)         if (lines.length > start) {
//#:(!DEBUG)             return prefix + ":" + arrSlice(lines, start, start + 5).join("\n") + "\n...";
//#:(!DEBUG)         }
//#:(!DEBUG)     }
//#:(!DEBUG)     return null;
//#:(!DEBUG) }
//#endif

/*#__NO_SIDE_EFFECTS__*/
function _createAggregationError(values: any[]) {
    !_aggregationError && (_aggregationError = createCachedValue(safe(getInst, ["AggregationError"]).v || createCustomError("AggregationError", (self, args) => {
        self.errors = args[0];
    })));

    return new _aggregationError.v(values);
}

/**
 * @ignore
 * @internal
 *
 * Implementing a simple synchronous promise interface for support within any environment that
 * doesn't support the Promise API
 * @param newPromise - The delegate function used to create a new promise object
 * @param processor - The function to use to process the pending
 * @param executor - The resolve function
 * @param additionalArgs - [Optional] Additional arguments that will be passed to the PromiseCreatorFn
 */
export function _createPromise<T>(newPromise: PromiseCreatorFn, processor: PromisePendingProcessor, executor: PromiseExecutor<T>, ...additionalArgs: any): IPromise<T>;

/**
 * @ignore
 * @internal
 *
 * Implementing a simple synchronous promise interface for support within any environment that
 * doesn't support the Promise API
 * @param newPromise - The delegate function used to create a new promise object
 * @param processor - The function to use to process the pending
 * @param executor - The resolve function
 * @param additionalArgs - [Optional] Additional arguments that will be passed to the PromiseCreatorFn
 */
export function _createPromise<T>(newPromise: PromiseCreatorFn, processor: PromisePendingProcessor, executor: PromiseExecutor<T>): IPromise<T> {
    let additionalArgs = arrSlice(arguments, 3);
    let _state = ePromiseState.Pending;
    let _hasResolved = false;
    let _settledValue: T;
    let _queue: (() => void)[] = [];
    let _id = _uniquePromiseId++;
    let _parentId = _currentPromiseId.length > 0 ? _currentPromiseId[_currentPromiseId.length - 1] : undefined;
    let _handled = false;
    let _unHandledRejectionHandler: ITimerHandler = null;
    let _thePromise: IPromise<T>;
    
    // https://tc39.es/ecma262/#sec-promise.prototype.then
    function _then<TResult1 = T, TResult2 = never>(onResolved?: ResolvedPromiseHandler<T, TResult1>, onRejected?: RejectedPromiseHandler<TResult2>): IPromise<TResult1 | TResult2> {
        try {
            _currentPromiseId.push(_id);
            _handled = true;
            _unHandledRejectionHandler && _unHandledRejectionHandler.cancel();
            _unHandledRejectionHandler = null;

            let thenPromise = newPromise<TResult1, TResult2>(function (resolve, reject) {
                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), _getCaller("_then", 7));
                //#endif

                // Queue the new promise returned to be resolved or rejected
                // when this promise settles.
                _queue.push(function () {
                    // https://tc39.es/ecma262/#sec-newpromisereactionjob
                    //let value: any;
                    try {
                        // First call the onFulfilled or onRejected handler, on the settled value
                        // of this promise. If the corresponding `handler` does not exist, simply
                        // pass through the settled value.
                        //#ifdef DEBUG
                        //#:(!DEBUG) _debugLog(_toString(), "Handling settled value " + dumpFnObj(_settledValue));
                        //#endif
                        let handler = _state === ePromiseState.Resolved ? onResolved : onRejected;
                        let value = isUndefined(handler) ? _settledValue : (isFunction(handler) ? handler(_settledValue) : handler);
                        //#ifdef DEBUG
                        //#:(!DEBUG) _debugLog(_toString(), "Handling Result " + dumpFnObj(value));
                        //#endif
    
                        if (isPromiseLike(value)) {
                            // The called handlers returned a new promise, so the chained promise
                            // will follow the state of this promise.
                            value.then(resolve as any, reject);
                        } else if (handler) {
                            // If we have a handler then chained promises are always "resolved" with the result returned
                            resolve(value as any);
                        } else if (_state === ePromiseState.Rejected) {
                            // If this promise is rejected then the chained promise should be rejected
                            // with either the settled value of this promise or the return value of the handler.
                            reject(value);
                        } else {
                            // If this promise is fulfilled, then the chained promise is also fulfilled
                            // with either the settled value of this promise or the return value of the handler.
                            resolve(value as any);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
    
                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), "Added to Queue " + _queue.length);
                //#endif
    
                // If this promise is already settled, then immediately process the callback we
                // just added to the queue.
                if (_hasResolved) {
                    _processQueue();
                }
            }, additionalArgs);
    
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Created -> " + thenPromise.toString());
            //#endif
    
            return thenPromise;
    
        } finally {
            _currentPromiseId.pop();
        }
    }

    // https://tc39.es/ecma262/#sec-promise.prototype.catch
    function _catch<TResult1 = T>(onRejected: RejectedPromiseHandler<TResult1>) {
        // Reuse then onRejected to support rejection
        return _then(undefined, onRejected);
    }

    // https://tc39.es/ecma262/#sec-promise.prototype.finally
    function _finally<TResult1 = T, TResult2 = never>(onFinally: FinallyPromiseHandler): IPromise<TResult1 | TResult2> {
        let thenFinally: any = onFinally;
        let catchFinally: any = onFinally;
        if (isFunction(onFinally)) {
            thenFinally = function(value: TResult1 | TResult2) {
                onFinally && onFinally();
                return value;
            }
    
            catchFinally = function(reason: any) {
                onFinally && onFinally();
                throw reason;
            }
        }

        return _then<TResult1, TResult2>(thenFinally as any, catchFinally as any);
    }

    function _strState() {
        return STRING_STATES[_state];
    }

    function _processQueue() {
        if (_queue.length > 0) {
            // The onFulfilled and onRejected handlers must be called asynchronously. Thus,
            // we make a copy of the queue and work on it once the current call stack unwinds.
            let pending = _queue.slice();
            _queue = [];

            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Processing queue " + pending.length);
            //#endif

            _handled = true;
            _unHandledRejectionHandler && _unHandledRejectionHandler.cancel();
            _unHandledRejectionHandler = null;
            processor(pending);
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Processing done");
            //#endif

        } else {
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Empty Processing queue ");
            //#endif
        }
    }

    function _createSettleIfFn(newState: ePromiseState, allowState: ePromiseState) {
        return (theValue: T) => {
            if (_state === allowState) {
                if (newState === ePromiseState.Resolved && isPromiseLike(theValue)) {
                    _state = ePromiseState.Resolving;
                    //#ifdef DEBUG
                    //#:(!DEBUG) _debugLog(_toString(), "Resolving");
                    //#endif
                    theValue.then(
                        _createSettleIfFn(ePromiseState.Resolved, ePromiseState.Resolving),
                        _createSettleIfFn(ePromiseState.Rejected, ePromiseState.Resolving));
                    return;
                }

                _state = newState;
                _hasResolved = true;
                _settledValue = theValue;
                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), _strState());
                //#endif
                _processQueue();
                if (!_handled && newState === ePromiseState.Rejected && !_unHandledRejectionHandler) {
                    //#ifdef DEBUG
                    //#:(!DEBUG) _debugLog(_toString(), "Setting up unhandled rejection");
                    //#endif
                    _unHandledRejectionHandler = scheduleTimeout(_notifyUnhandledRejection, _unhandledRejectionTimeout)
                }
            } else {
                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), "Already " + _strState());
                //#endif
            }
        };
    }

    function _notifyUnhandledRejection() {
        if (!_handled) {
            // Mark as handled so we don't keep notifying
            _handled = true;
            if (isNode()) {
                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), "Emitting " + NODE_UNHANDLED_REJECTION);
                //#endif
                process.emit(NODE_UNHANDLED_REJECTION, _settledValue, _thePromise);
            } else {
                let gbl = getWindow() || getGlobal();
    
                !_hasPromiseRejectionEvent && (_hasPromiseRejectionEvent = createCachedValue(safe(getInst<_PromiseRejectionEvent>, [STR_PROMISE + "RejectionEvent"]).v));

                //#ifdef DEBUG
                //#:(!DEBUG) _debugLog(_toString(), "Emitting " + UNHANDLED_REJECTION);
                //#endif
                emitEvent(gbl, UNHANDLED_REJECTION, (theEvt: any) => {
                    objDefine(theEvt, "promise", { g: () => _thePromise });
                    theEvt.reason = _settledValue;
                    return theEvt;
                }, !!_hasPromiseRejectionEvent.v);
            }
        }
    }

    _thePromise = {
        then: _then,
        "catch": _catch,
        finally: _finally
    } as any;

    objDefineProp(_thePromise, "state", {
        get: _strState
    });

    if (_promiseDebugEnabled) {
        // eslint-disable-next-line brace-style
        _addDebugState(_thePromise, _strState, () => { return objToString(_settledValue); }, () => _handled);
    }

    if (hasSymbol()) {
        (_thePromise as any)[getKnownSymbol<symbol>(WellKnownSymbols.toStringTag)] = "IPromise";
    }

    let createStack: string;
    //#if DEBUG
    //#:(!{DEBUG}) createStack = _getCaller("Created", 5);
    //#endif
    function _toString() {
        return "IPromise" + (_promiseDebugEnabled ? "[" + _id + (!isUndefined(_parentId) ? (":" + _parentId) : "") + "]" : "") + " " + _strState() + (_hasResolved ? (" - " + dumpFnObj(_settledValue)) : "") + (createStack ? " @ " + createStack : "");
    }

    _thePromise.toString = _toString;

    (function _initialize() {
        if (!isFunction(executor)) {
            throwTypeError(STR_PROMISE + ": executor is not a function - " + dumpFnObj(executor));
        }

        const _rejectFn = _createSettleIfFn(ePromiseState.Rejected, ePromiseState.Pending);
        try {
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Executing");
            //#endif
            executor.call(
                _thePromise,
                _createSettleIfFn(ePromiseState.Resolved, ePromiseState.Pending),
                _rejectFn);
        } catch (e) {
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(_toString(), "Exception thrown: " + dumpFnObj(e));
            //#endif
            _rejectFn(e);
        }

        //#ifdef DEBUG
        //#:(!DEBUG) _debugLog(_toString(), "~Executing");
        //#endif
    })();

    //#ifdef DEBUG
    //#:(!DEBUG) _debugLog(_toString(), "Returning");
    //#endif
    return _thePromise;
}

/**
 * @ignore
 * @internal
 * Returns a function which when called will return a new Promise object that resolves to an array of the
 * results from the input promises. The returned promise will resolve when all of the inputs' promises have
 * resolved, or if the input contains no promises. It rejects immediately upon any of the input promises
 * rejected or non-promises throwing an error, and will reject with this first rejection message / error.
 * @param newPromise - The delegate function used to create a new promise object the new promise instance.
 * @returns A function to create a promise that will be resolved when all arguments are resolved.
 */
/*#__NO_SIDE_EFFECTS__*/
export function _createAllPromise(newPromise: PromiseCreatorFn): <T>(input: Iterable<T | PromiseLike<T>>, ...additionalArgs: any) => IPromise<Awaited<T>[]> {
    return function <T>(input: Iterable<T | PromiseLike<T>>): IPromise<Awaited<T>[]> {
        let additionalArgs = arrSlice(arguments, 1);
        return newPromise<Awaited<T>[]>((resolve, reject) => {
            try {
                let values = [] as any;
                let pending = 1;            // Prefix to 1 so we finish iterating over all of the input promises first

                iterForOf(input, (item, idx) => {
                    if (item) {
                        pending++;
                        doAwait(item, (value) => {
                            // Set the result values
                            values[idx] = value;
                            if (--pending === 0) {
                                resolve(values);
                            }
                        }, reject);
                    }
                });

                // Now decrement the pending so that we finish correctly
                pending--;
                if (pending === 0) {
                    // All promises were either resolved or where not a promise
                    resolve(values);
                }
            } catch (e) {
                reject(e);
            }
        }, additionalArgs);
    };
}

/**
 * @ignore
 * @internal
 * The createResolvedPromise returns a PromiseLike object that is resolved with a given value. If the value is
 * PromiseLike (i.e. has a "then" method), the returned promise will "follow" that thenable, adopting its eventual
 * state; otherwise the returned promise will be fulfilled with the value. This function flattens nested layers
 * of promise-like objects (e.g. a promise that resolves to a promise that resolves to something) into a single layer.
 * @param newPromise - The delegate function used to create a new promise object
 * @param value - Argument to be resolved by this Promise. Can also be a Promise or a thenable to resolve.
 * @param additionalArgs - Any additional arguments that should be passed to the delegate to assist with the creation of
 * the new promise instance.
 */
/*#__NO_SIDE_EFFECTS__*/
export function _createResolvedPromise(newPromise: PromiseCreatorFn): <T>(value: T, ...additionalArgs: any) => IPromise<T> {
    return function <T>(value: T): IPromise<T> {
        let additionalArgs = arrSlice(arguments, 1);
        if (isPromiseLike<T>(value)) {
            return value as unknown as IPromise<T>;
        }
    
        return newPromise((resolve) => {
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(String(this), "Resolving Promise");
            //#endif
            resolve(value);
        }, additionalArgs);
    };
}

/**
 * @ignore
 * @internal
 * Return a promise like object that is rejected with the given reason.
 * @param newPromise - The delegate function used to create a new promise object
 * @param reason - The rejection reason
 * @param additionalArgs - Any additional arguments that should be passed to the delegate to assist with the creation of
 * the new promise instance.
 */
/*#__NO_SIDE_EFFECTS__*/
export function _createRejectedPromise(newPromise: PromiseCreatorFn): <T>(reason: any, ...additionalArgs: any) => IPromise<T> {
    return function <T>(reason: any): IPromise<T> {
        let additionalArgs = arrSlice(arguments, 1);
        return newPromise((_resolve, reject) => {
            //#ifdef DEBUG
            //#:(!DEBUG) _debugLog(String(this), "Rejecting Promise");
            //#endif
            reject(reason);
        }, additionalArgs);
    };
}

/**
 * @ignore
 * @internal
 * @since 0.5.0
 * Returns a function which when called will return a new Promise object that resolves to an array of
 * IPromiseResults from the input promises. The returned promise will resolve when all of the inputs'
 * promises have resolved or rejected, or if the input contains no promises. It will resolve only after
 * all input promises have been fulfilled (resolve or rejected).
 * @param newPromise - The delegate function used to create a new promise object the new promise instance.
 * @returns A function to create a promise that will be resolved when all arguments are resolved.
 */
/*#__NO_SIDE_EFFECTS__*/
export function _createAllSettledPromise(newPromise: PromiseCreatorFn, ..._args: any[]): ICachedValue<<T extends readonly unknown[] | []>(input: T, timeout?: number) => IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>> {
    return createCachedValue(function <T>(input: T, ..._args: any[]): IPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }> {
        let additionalArgs = arrSlice(arguments, 1);
        return newPromise<{ -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; }>((resolve, reject) => {
            let values: { -readonly [P in keyof T]: IPromiseResult<Awaited<T[P]>>; } = [] as any;
            let pending = 1;            // Prefix to 1 so we finish iterating over all of the input promises first

            function processItem(item: any, idx: number) {
                pending++;
                doAwaitResponse(item, (value) => {
                    if (value.rejected) {
                        (values as any)[idx] = {
                            status: REJECTED,
                            reason: value.reason
                        };
                    } else {
                        (values as any)[idx] = {
                            status: "fulfilled",
                            value: value.value
                        };
                    }
                
                    if (--pending === 0) {
                        resolve(values);
                    }
                });
            }

            try {

                if (isArray(input)) {
                    arrForEach(input, processItem);
                } else if (isIterable(input)) {
                    iterForOf(input, processItem);
                } else {
                    throwTypeError("Input is not an iterable");
                }

                // Now decrement the pending so that we finish correctly
                pending--;
                if (pending === 0) {
                    // All promises were either resolved or where not a promise
                    resolve(values);
                }
            } catch (e) {
                reject(e);
            }
        }, additionalArgs);
    });
}

/**
 * @ignore
 * @internal
 * @since 0.5.0
 * Returns a function takes an iterable of promises as input and returns a single Promise.
 * This returned promise settles with the eventual state of the first promise that settles.
 * @description The returned promise is one of the promise concurrency methods. It's useful when you want
 * the first async task to complete, but do not care about its eventual state (i.e. it can either succeed
 * or fail).
 * @param newPromise - The delegate function used to create a new promise object the new promise instance.
 * @returns A function to create a promise that will resolve when the first promise to settle is fulfilled,
 * and rejects if the first promise to settle is rejected. The returned promise remains pending forever
 * if the iterable passed is empty. If the iterable passed is non-empty but contains no pending promises,
 * the returned promise is still settled.
 */
/*#__NO_SIDE_EFFECTS__*/
export function  _createRacePromise(newPromise: PromiseCreatorFn, ..._args: any[]): ICachedValue<<T extends readonly unknown[] | []>(values: T, timeout?: number) => IPromise<Awaited<T[number]>>> {
    return createCachedValue(function <T extends readonly unknown[] | []>(input: T, ..._args: any[]): IPromise<Awaited<T[number]>> {
        let additionalArgs = arrSlice(arguments, 1);
        return newPromise<Awaited<T[number]>>((resolve, reject) => {
            let isDone = false;

            function processItem(item: any) {
                doAwaitResponse(item, (value) => {
                    if (!isDone) {
                        isDone = true;
                        if (value.rejected) {
                            reject(value.reason);
                        } else {
                            resolve(value.value);
                        }
                    }
                });
            }

            try {
                if (isArray(input)) {
                    arrForEach(input, processItem);
                } else if (isIterable(input)) {
                    iterForOf(input, processItem);
                } else {
                    throwTypeError("Input is not an iterable");
                }

            } catch (e) {
                reject(e);
            }
        }, additionalArgs);
    });
}

/**
 * @internal
 * @ignore
 * @since 0.5.0
 * Returns a function takes an iterable of promises as input and returns a single Promise.
 * This returned promise fulfills when any of the input's promises fulfills, with this first fulfillment
 * value. It rejects when all of the input's promises reject (including when an empty iterable is passed),
 * with an AggregateError containing an array of rejection reasons.
 * @param newPromise - The delegate function used to create a new promise object the new promise instance.
 * @returns A function to create a promise that will resolve when the any of the input's promises fulfills,
 * with this first fulfillment value. It rejects when all of the input's promises reject (including when
 * an empty iterable is passed), with an AggregateError containing an array of rejection reasons.
 */
/*#__NO_SIDE_EFFECTS__*/
export function  _createAnyPromise(newPromise: PromiseCreatorFn, ..._args: any[]): ICachedValue<<T extends readonly unknown[] | []>(values: T) => IPromise<Awaited<T[number]>>> {
    return createCachedValue(function <T extends readonly unknown[] | []>(input: T, ..._args: any[]): IPromise<Awaited<T[number]>> {
        let additionalArgs = arrSlice(arguments, 1);
        return newPromise<Awaited<T[number]>>((resolve, reject) => {
            let theErros: Array<any> = [] as any;
            let pending = 1;            // Prefix to 1 so we finish iterating over all of the input promises first
            let isDone = false;

            function processItem(item: any, idx: number) {
                pending++;
                doAwaitResponse(item, (value ) => {
                    if (!value.rejected) {
                        isDone = true;
                        resolve(value.value);
                        return;
                    } else {
                        theErros[idx] = value.reason;
                    }

                    if (--pending === 0 && !isDone) {
                        reject(_createAggregationError(theErros));
                    }
                });
            }

            try {
                if (isArray(input)) {
                    arrForEach(input, processItem);
                } else if (isIterable(input)) {
                    iterForOf(input, processItem);
                } else {
                    throwTypeError("Input is not an iterable");
                }

                // Now decrement the pending so that we finish correctly
                pending--;
                if (pending === 0 && !isDone) {
                    // All promises were either resolved or where not a promise
                    reject(_createAggregationError(theErros));
                }
            } catch (e) {
                reject(e);
            }
        }, additionalArgs);
    });
}
