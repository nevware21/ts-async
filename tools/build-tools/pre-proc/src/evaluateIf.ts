/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objHasOwn } from "@nevware21/ts-utils";
import { IStateContext } from "./interfaces/IStateContext";

/**
 * Evaluates an if statement
 * @param context - The current state context
 * @param statement - The statement to evaluate
 * @returns The result of the evaluation
 */
export function evaluateIf(context: IStateContext, statement: string) {
    let prxy = new Proxy(context.defs, {
        get: function(target: any, prop: string) {
            if (objHasOwn(target, prop)) {
                return target[prop];
            }

            return undefined;
        }
    });

    return (new Function("with(this) { try { return " + statement + "; } catch(e) { return false; } }")).call(prxy);
}
