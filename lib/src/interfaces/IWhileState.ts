/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "./IPromise";

/**
 * The current state of the while loop while processing the callback function, this is
 * passed to eht callback function.
 * @typeParam T - Identifies the element type returned by the callback function.
 * @since 0.5.0
 */
export interface IWhileState<T> {
    /**
     * The number of milliseconds that have elapsed since January 1, 1970 00:00:00 UTC,
     * at the beginning of the while loop. This value is set at the beginning of the while
     * loop via [`utcNow()`](https://nevware21.github.io/ts-utils/typedoc/functions/utcNow.html)
     * (`Date.now()`) and is not updated during the execution of while loop.
     */
    st: number

    /**
     * The zero-based iteration count, which is increased after each call to the callback.
     */
    iter: number;

    /**
     * The resolved result value returned by the callback function.
     */
    res?: T;

    /**
     * Callback to enable the caller stop the while loop.
     */
    isDone: boolean | ((state: IWhileState<T>) => boolean | void | IPromise<boolean | void> | PromiseLike<boolean | void>);
}
