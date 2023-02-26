/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

/**
 * Simple interface to convert a promise then (resolve/reject) into a single response
 */
export interface AwaitResponse<T> {
    /**
     * The value returned by the resolved promise
     */
    value?: T;

    /**
     * Identifies if the promise was rejected (true) or was resolved (false/undefined)
     */
    rejected?: boolean;

     /**
     * The reason returned when the promise rejected
     */
    reason?: any;
}
