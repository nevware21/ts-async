/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { objHasOwn } from "@nevware21/ts-utils";
import { DefinedState } from "./constants";
import { IState } from "./interfaces/IState";
import { IStateContext } from "./interfaces/IStateContext";

const escapeName = (name: string) => {
    return (name ||"").replace(/\(/g, "[").replace(/\)/g, "]");
}

export const processDirective = (context: IStateContext, prefix: string, defined: string): IState => {
    let currentState = context.states.length ? context.states[context.states.length - 1] : { name: "", state: DefinedState.NotSet, prefix: "" };
    let theState = currentState.state;

    //console.log(` - [${defined}]`);
    if (defined === "endif" && context.states.length > 0) {
        context.states.pop();
    } else if (defined === "else" && context.states.length > 0) {
        context.states.pop();

        // Reverse the previous state
        switch(theState) {          
            case DefinedState.Defined:
                context.states.push({
                    name: escapeName("!" + currentState.name),
                    state: DefinedState.NotDefined,
                    prefix
                });
                break;
            case DefinedState.NotDefined:
                context.states.push({
                    name: escapeName("!" + currentState.name),
                    state: DefinedState.Defined,
                    prefix
                });
                break;
            default:
                context.states.push({
                    name: currentState.name,
                    state: DefinedState.NotSet,
                    prefix
                });
                break;
        }
    } else if(defined.startsWith("ifdef ")) {
        let name = defined.substring(6).trim();
        if (objHasOwn(context.defs, name)) {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix
            });
        } else {
            context.states.push({
                name: escapeName("!" + name),
                state: DefinedState.NotDefined,
                prefix
            });
        }
    } else if(defined.startsWith("ifndef ")) {
        let name = defined.substring(7).trim();
        if (objHasOwn(context.defs, name)) {
            context.states.push({
                name: escapeName("!" + name),
                state: DefinedState.NotDefined,
                prefix
            });
        } else {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix
            });
        }
    } else {
        console.error(`Unknown/Unsupported directive [${defined}]`);
    }

    return context.states.length ? context.states[context.states.length - 1] : { name: "", state: DefinedState.NotSet, prefix };
}
