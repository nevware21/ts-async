/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { objDefineProp } from "@nevware21/ts-utils";

let _debugState: any;
let _debugResult: any;
let _debugHandled: any;

/**
 * @internal
 * @ignore
 */
export let _promiseDebugEnabled = false;

let _theLogger: (id: string, message: string) => void = null;

/**
 * @internal
 * @ignore Internal function enable logging the internal state of the promise during execution, this code and references are
 * removed from the production artifacts
 */
export function _debugLog(id: string, message: string) {
    if (_theLogger) {
        _theLogger(id, message);
    }
}

/**
 * @internal
 * @ignore Internal function to add the debug state to the promise, this code is removed from the production artifacts
 * @param thePromise
 * @param stateFn
 * @param resultFn
 * @param handledFn
 */
export function _addDebugState(thePromise: any, stateFn: () => string, resultFn: () => string, handledFn: () => boolean) {
    _debugState = _debugState || { toString: () => "[[PromiseState]]" };
    _debugResult = _debugResult || { toString: () => "[[PromiseResult]]" };
    _debugHandled = _debugHandled || { toString: () => "[[PromiseIsHandled]]" };
    
    objDefineProp(thePromise, _debugState, { get: stateFn });
    objDefineProp(thePromise, _debugResult, { get: resultFn });
    objDefineProp(thePromise, _debugHandled, { get: handledFn });
}

/**
 * Debug helper to enable internal debugging of the promise implementations. Disabled by default.
 * @param enabled - Should debugging be enabled
 * @param logger - Optional logger that will log internal state changes, only called in debug builds as the calling function
 * is removed is the production artifacts
 */
export function setPromiseDebugState(enabled: boolean, logger?: (id: string, message: string) => void) {
    _promiseDebugEnabled = enabled;
    _theLogger = logger;
}