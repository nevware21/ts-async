/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, isNumber, scheduleMicrotask, scheduleTimeout } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { PromiseExecutor } from "../interfaces/types";
import { _normalizeTimeoutValue } from "../internal/timeout_helpers";

export type PromisePendingProcessor = (pending: PromisePendingFn[]) => void;
export type PromisePendingFn = () => void;
export type PromiseCreatorFn = <T, TResult2 = never>(newExecutor: PromiseExecutor<T>, ...extraArgs: any) => IPromise<T | TResult2>;

/**
 * @internal
 * @ignore
 * The default value used by {@link setMaxSyncPromiseChainDepth}, see {@link _maxSyncChainDepth}
 */
const DEFAULT_MAX_SYNC_CHAIN_DEPTH = 200;

/**
 * @internal
 * @ignore
 * The currently configured maximum number of consecutive promise reaction continuations that will be
 * executed synchronously (in the same call stack) before a microtask "hop" is forced, see
 * {@link setMaxSyncPromiseChainDepth}.
 */
let _maxSyncChainDepth = DEFAULT_MAX_SYNC_CHAIN_DEPTH;

/**
 * @internal
 * @ignore
 * Tracks how many promise reaction continuations have been executed consecutively within the current
 * synchronous call stack. This is incremented immediately before, and decremented immediately after,
 * invoking a pending continuation, so it behaves as a simple call-stack depth counter -- it is restored
 * back to its previous value once any nested (recursively chained) continuations have unwound, and it
 * is always back at zero by the time any genuine asynchronous callback (a timer, microtask or idle
 * callback) is invoked, as the JS call stack is guaranteed to be empty at that point.
 */
let _syncChainDepth = 0;

/**
 * Sets the maximum number of consecutive promise reaction continuations (chained `then`/`catch`/`finally`
 * handlers becoming ready to run) that will be executed synchronously, within the same JavaScript call
 * stack, before this library forces an async "hop" (microtask; or a 0ms timeout when Sinon fake timers
 * are enabled) to unwind the stack before continuing. This is a safety-net against unbounded call-stack
 * growth (and eventual `RangeError: Maximum call stack size exceeded`) which could otherwise occur when
 * synchronously resolving very deep or recursively chained promises, or a "hostile" thenable whose
 * `then()` implementation resolves itself recursively and synchronously.
 * The depth is only ever consumed while continuations are being run synchronously (eg. via
 * {@link createSyncPromise}, or once an asynchronous processor's own timer / microtask / idle callback
 * has already fired). When the limit is exceeded, the current continuation is deferred so the stack can
 * unwind; this means very deep / recursive "sync" chains may yield asynchronously. The depth is
 * automatically restored (effectively "reset") once execution returns to, or is resumed from, a genuine
 * asynchronous boundary.
 * @since 0.7.0
 * @group Promise
 * @param maxDepth - The maximum number of consecutive synchronous continuations to allow before forcing
 * an asynchronous (microtask) hop. Defaults to 200 when omitted / non-numeric. Passing zero or a negative
 * value disables the guard so that continuations are always executed synchronously (the previous,
 * unbounded, behavior) -- this is not recommended other than for compatibility purposes.
 * @example
 * ```ts
 * // Reduce the depth for more constrained environments
 * setMaxSyncPromiseChainDepth(50);
 *
 * // Disable the guard (not recommended)
 * setMaxSyncPromiseChainDepth(0);
 *
 * // Restore the default
 * setMaxSyncPromiseChainDepth(200);
 * ```
 */
export function setMaxSyncPromiseChainDepth(maxDepth?: number): void {
    _maxSyncChainDepth = isNumber(maxDepth) ? maxDepth : DEFAULT_MAX_SYNC_CHAIN_DEPTH;
}

/**
 * @internal
 * @ignore
 * When `true`, {@link _isFakeTimersEnabled} is forced to always report `false` regardless of whether a
 * patched `setTimeout.clock` is actually present, see {@link setDisableFakeTimersDetection}.
 */
let _disableFakeTimersDetection = false;

/**
 * Enables or disables this library's automatic detection of Sinon-style fake timers (a patched
 * `setTimeout` exposing a `.clock` property). By default (and when this function has never been called,
 * or has been called with `undefined`) detection remains active -- this is the existing / historical
 * behavior, so any global that patches `setTimeout` and happens to also expose a `.clock` property (not
 * necessarily Sinon) will still be treated as fake timers and change this library's internal scheduling
 * (eg. using a `0ms` timeout "hop" instead of a microtask when deferring a queued continuation).
 * Passing `true` disables the detection so it always behaves as though fake timers are **not** present
 * (real microtask / timer scheduling is always used), which avoids that false-positive fingerprinting
 * risk for consumers who don't rely on it. Passing `false` re-enables detection.
 * @since 0.7.0
 * @group Promise
 * @param disable - When `true` (or any other truthy value), disables fake timer detection so
 * {@link _isFakeTimersEnabled} always returns `false`. When `false` (or any other falsy value),
 * (re-)enables detection. When `undefined`, restores the default (detection enabled).
 * @example
 * ```ts
 * // Disable fake timer detection -- this library will never treat a patched
 * // setTimeout.clock as an indication that fake timers are active
 * setDisableFakeTimersDetection(true);
 *
 * // Re-enable detection
 * setDisableFakeTimersDetection(false);
 *
 * // Restore the default (detection enabled)
 * setDisableFakeTimersDetection();
 * ```
 */
export function setDisableFakeTimersDetection(disable?: boolean): void {
    _disableFakeTimersDetection = disable === undefined ? false : !!disable;
}

function _isFakeTimersEnabled(): boolean {
    if (_disableFakeTimersDetection) {
        return false;
    }

    // Sinon fake timers patch setTimeout and expose the active clock instance as `setTimeout.clock`.
    // This check intentionally targets that behavior so async promise callbacks remain testable with fake clocks.
    let setTimeoutFn = setTimeout as any;
    return !!(setTimeoutFn && setTimeoutFn.clock);
}

/**
 * @internal
 * @ignore
 * Executes the given pending continuation, tracking (and bounding) how many consecutive synchronous
 * continuations have been executed. Once the configured maximum ({@link setMaxSyncPromiseChainDepth})
 * has been reached, the continuation is instead deferred via a microtask (or a 0ms timeout when Sinon
 * fake timers are enabled) so the call stack can unwind; the depth is naturally back at zero by the
 * time that deferred continuation actually runs.
 * @param fn - The pending continuation to execute
 */
function _runPendingItem(fn: PromisePendingFn): void {
    if (_maxSyncChainDepth > 0 && _syncChainDepth >= _maxSyncChainDepth) {
        let pendingFn = function () {
            _runPendingItem(fn);
        };

        if (_isFakeTimersEnabled()) {
            // Under Sinon fake timers, queued microtasks are not advanced by clock ticks in this test suite,
            // so use setTimeout(0) to keep callback progression deterministic while fake timers are active.
            scheduleTimeout(pendingFn, 0);
        } else {
            scheduleMicrotask(pendingFn);
        }

        return;
    }

    _syncChainDepth++;
    try {
        fn();
    } catch (e) {
        // Don't let 1 failing handler break all others
        // TODO: Add some form of error reporting (i.e. Call any registered JS error handler so the error is reported)
    } finally {
        _syncChainDepth--;
    }
}

/**
 * @internal
 * @ignore
 * Return an item processor that processes all of the pending items synchronously
 * @return An item processor
 */
export function syncItemProcessor(pending: PromisePendingFn[]): void {
    arrForEach(pending, _runPendingItem);
}

/**
 * @internal
 * @ignore
 * Return an item processor that processes all of the pending items asynchronously using the optional timeout.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 * @return An item processor
 */
export function timeoutItemProcessor(timeout?: number): (pending: PromisePendingFn[]) => void {
    let timeoutValue = _normalizeTimeoutValue(timeout);
    let hasTimeout = isNumber(timeoutValue);
    let callbackTimeout = hasTimeout ? (timeoutValue as number) : 0;

    return (pending: PromisePendingFn[]) => {
        function _processPending() {
            syncItemProcessor(pending);
        }

        if (hasTimeout && callbackTimeout > 0) {
            scheduleTimeout(_processPending, callbackTimeout);
        } else if (_isFakeTimersEnabled()) {
            // Under Sinon fake timers, queued microtasks are not advanced by clock ticks in this test suite,
            // so use setTimeout(0) to keep callback progression deterministic while fake timers are active.
            scheduleTimeout(_processPending, 0);
        } else {
            scheduleMicrotask(_processPending);
        }
    }
}
