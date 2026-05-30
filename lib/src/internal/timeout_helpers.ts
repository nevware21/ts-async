/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isArray, isNumber, isUndefined } from "@nevware21/ts-utils";

/**
 * @internal
 * @ignore
 * Normalizes timeout values that may be passed either directly or inside an extra-args array.
 * @param timeout - The timeout value or argument array.
 * @param defaultTimeout - The fallback timeout when no explicit timeout is provided.
 * @returns The normalized timeout value.
 */
/*#__NO_SIDE_EFFECTS__*/
export function _normalizeTimeoutValue(timeout?: number | any, defaultTimeout?: number): number | undefined {
    let result = defaultTimeout;
    if (!isUndefined(timeout)) {
        if (isNumber(timeout)) {
            result = timeout;
        } else {

            // Promise creation can re-wrap additional args for chained promises (for example [[10]]).
            // Unwrap nested array values so explicit timeouts keep flowing through then/catch/finally chains.
            while(!isUndefined(timeout) && isArray(timeout) && timeout.length > 0) {
                timeout = timeout[0];

                if (isNumber(timeout)) {
                    result = timeout;
                    break;
                }
            }
        }
    }

    return result;
}
