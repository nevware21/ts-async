/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objDefineProperties } from "@nevware21/ts-utils";
import { _pureAssign } from "../internal/treeshake_helpers";

let _debugState: any;
let _debugResult: any;
let _debugHandled: any;

/**
 * @internal
 * @ignore
 */
export let _promiseDebugEnabled = false;

//#ifdef DEBUG
let _theLogger: (id: string, message: string) => void = null;
//#endif

/**
 * @internal
 * @ignore Internal function enable logging the internal state of the promise during execution, this code and references are
 * removed from the production artifacts
 */
export const _debugLog = (/*#__PURE__*/_pureAssign((id: string, message: string) => {
    //#ifdef DEBUG
    if (_theLogger) {
        _theLogger(id, message);
    }
    //#endif
}));

/**
 * @internal
 * @ignore
 * Internal function to add the debug state to the promise so that it provides simular visibility as you would
 * see from native promises
 * @param thePromise - The Promise implementation
 * @param stateFn - The function to return the state of the promise
 * @param resultFn - The function to return the result (settled value) of the promise
 * @param handledFn - The function to return whether the promise has been handled (used for throwing
 * unhandled rejection events)
 */
export function _addDebugState(thePromise: any, stateFn: () => string, resultFn: () => string, handledFn: () => boolean) {
    // While the IPromise implementations provide a `state` property, keeping the `[[PromiseState]]`
    // as native promises also have a non-enumerable property of the same name
    _debugState = _debugState || { toString: () => "[[PromiseState]]" };
    _debugResult = _debugResult || { toString: () => "[[PromiseResult]]" };
    _debugHandled = _debugHandled || { toString: () => "[[PromiseIsHandled]]" };
    
    let props: PropertyDescriptorMap = {};
    props[_debugState] = { get: stateFn };
    props[_debugResult] = { get: resultFn };
    props[_debugHandled] = { get: handledFn };

    objDefineProperties(thePromise, props);
}

/**
 * Debug helper to enable internal debugging of the promise implementations. Disabled by default.
 * For the generated packages included in the npm package the `logger` will not be called as the
 * `_debugLog` function that uses this logger is removed during packaging.
 *
 * It is available directly from the repository for unit testing.
 *
 * @group Debug
 * @param enabled - Should debugging be enabled (defaults `false`, when `true` promises will have
 * additional debug properties and the `toString` will include extra details.
 * @param logger - Optional logger that will log internal state changes, only called in debug
 * builds as the calling function is removed is the production artifacts.
 * @example
 * ```ts
 * // The Id is the id of the promise
 * // The message is the internal debug message
 * function promiseDebugLogger(id: string, message: string) {
 *     if (console && console.log) {
 *         console.log(id, message);
 *     }
 * }
 *
 * setPromiseDebugState(true, promiseDebugLogger);
 *
 * // While the logger will not be called for the production packages
 * // Setting the `enabled` flag to tru will cause each promise to have
 * // the following additional properties added
 * // [[PromiseState]]; => Same as the `state` property
 * // [[PromiseResult]]; => The settled value
 * // [[PromiseIsHandled]] => Identifies if the promise has been handled
 * // It will also cause the `toString` for the promise to include additional
 * // debugging information
 * ```
 */
export function setPromiseDebugState(enabled: boolean, logger?: (id: string, message: string) => void) {
    _promiseDebugEnabled = enabled;
    //#ifdef DEBUG
    _theLogger = logger;
    //#endif
}