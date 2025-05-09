/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { REJECTED } from "./constants";

/**
 * @ignore -- Don't include in the generated documentation
 * @internal
 */
export const enum ePromiseState {
    Pending = 0,
    Resolving = 1,
    Resolved = 2,
    Rejected = 3
}

/**
 * @ignore -- Don't include in the generated documentation
 * @internal
 */
export const STRING_STATES: string[] = [
    "pending", "resolving", "resolved", REJECTED
];
