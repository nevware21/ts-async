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

function _isFakeTimersEnabled(): boolean {
    // Sinon fake timers patch setTimeout and expose the active clock instance as `setTimeout.clock`.
    // This check intentionally targets that behavior so async promise callbacks remain testable with fake clocks.
    let setTimeoutFn = setTimeout as any;
    return !!(setTimeoutFn && setTimeoutFn.clock);
}

/**
 * @internal
 * @ignore
 * Return an item processor that processes all of the pending items synchronously
 * @return An item processor
 */
export function syncItemProcessor(pending: PromisePendingFn[]): void {
    arrForEach(pending, (fn: PromisePendingFn) => {
        try {
            fn();
        } catch (e) {
            // Don't let 1 failing handler break all others
            // TODO: Add some form of error reporting (i.e. Call any registered JS error handler so the error is reported)
        }
    });
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
