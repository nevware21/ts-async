/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { arrForEach, isNumber, scheduleIdleCallback, scheduleTimeout } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";
import { PromiseExecutor } from "../interfaces/types";

export type PromisePendingProcessor = (pending: PromisePendingFn[]) => void;
export type PromisePendingFn = () => void;
export type PromiseCreatorFn = <T, TResult2 = never>(newExecutor: PromiseExecutor<T>, ...extraArgs: any) => IPromise<T | TResult2>;

function _processPendingItems(pending: PromisePendingFn[]) {
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
 * Return an item processor that processes all of the pending items synchronously
 * @return An item processor
 */
export function syncItemProcessor(): (pending: PromisePendingFn[]) => void {
    return _processPendingItems;
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

    return function (pending: PromisePendingFn[]) {
        scheduleTimeout(() => {
            _processPendingItems(pending);
        }, callbackTimeout);
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

    return function (pending: PromisePendingFn[]) {
        scheduleIdleCallback((deadline: IdleDeadline) => {
            _processPendingItems(pending);
        }, options);
    };
}