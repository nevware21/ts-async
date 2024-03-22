/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2024 Nevware21
 * Licensed under the MIT license.
 */

import { objHasOwn, strEndsWith, strStartsWith } from "@nevware21/ts-utils";
import { IStateContext } from "./interfaces/IStateContext";

/**
 * Evaluates a define statement
 * @param context - The current state context
 * @param name - The name of the define to evaluate for existence
 * @returns The result of the evaluation
 */
export function evaluateDefine(context: IStateContext, name: string) {
    if (objHasOwn(context.defs, name)) {
        return context.defs[name];
    }

    if (strStartsWith(name, "(") && strEndsWith(name, ")")) {
        return evaluateDefine(context, name.substring(1, name.length - 1));
    }

    return false;
}
