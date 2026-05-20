/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, getInst, isFunction, isNumber, safe, scheduleIdleCallback, scheduleTimeout } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { PromiseExecutor } from "../interfaces/types";

export type PromisePendingProcessor = (pending: PromisePendingFn[]) => void;
export type PromisePendingFn = () => void;
export type PromiseCreatorFn = <T, TResult2 = never>(newExecutor: PromiseExecutor<T>, ...extraArgs: any) => IPromise<T | TResult2>;

const _queueMicroTask = /*#__PURE__*/safe(getInst<(callback: () => void) => void>, [ "queueMicrotask" ]).v;

function _processPending(pending: PromisePendingFn[]): void {
    syncItemProcessor(pending);
}

function _isFakeTimersEnabled(): boolean {
    let timerFn = setTimeout as any;
    return !!(timerFn && timerFn.clock);
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
    let callbackTimeout = isNumber(timeout) ? timeout : 0;

    return (pending: PromisePendingFn[]) => {
        if (callbackTimeout > 0) {
            scheduleTimeout(() => {
                _processPending(pending);
            }, callbackTimeout);
        } else if (_isFakeTimersEnabled()) {
            scheduleTimeout(() => {
                _processPending(pending);
            }, 0);
        } else if (typeof Promise !== "undefined" && Promise.resolve) {
            Promise.resolve().then(() => {
                _processPending(pending);
            });
        } else if (isFunction(_queueMicroTask)) {
            _queueMicroTask(() => {
                _processPending(pending);
            });
        } else {
            scheduleTimeout(() => {
                _processPending(pending);
            }, 0);
        }
    }
}

/**
 * @internal
 * @ignore
 * Return an item processor that processes all of the pending items using an idle callback (if available) or based on
 * a timeout (when `requestIdenCallback` is not supported) using the optional timeout.
 * @param timeout - Optional timeout to wait before processing the items, defaults to zero.
 * @return An item processor
 */
export function idleItemProcessor(timeout?: number): (pending: PromisePendingFn[]) => void {
    let options: any;
    if (timeout >= 0) {
        options = {
            timeout: +timeout
        };
    }

    return (pending: PromisePendingFn[]) => {
        scheduleIdleCallback((deadline: IdleDeadline) => {
            syncItemProcessor(pending);
        }, options);
    };
}
