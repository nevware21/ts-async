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
 * The maximum number of nested array levels that {@link _normalizeTimeoutValue} will unwrap while
 * looking for a numeric timeout value. This bounds the work performed against a self-referential
 * array (e.g. `const a: any[] = []; a[0] = a;`), which would otherwise loop forever.
 */
const _MAX_TIMEOUT_UNWRAP_DEPTH = 5;

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
            let depth = 0;
            while(!isUndefined(timeout) && isArray(timeout) && timeout.length > 0 && depth < _MAX_TIMEOUT_UNWRAP_DEPTH) {
                timeout = timeout[0];
                depth++;

                if (isNumber(timeout)) {
                    result = timeout;
                    break;
                }
            }
        }
    }

    return result;
}
