/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { objHasOwn } from "@nevware21/ts-utils";
import { DefinedState, DirectiveType } from "./constants";
import { IState } from "./interfaces/IState";
import { IStateContext } from "./interfaces/IStateContext";
import { evaluateIf } from "./evaluateIf";

const escapeName = (name: string) => {
    return (name ||"").replace(/\(/g, "[").replace(/\)/g, "]");
}

export const processDirective = (context: IStateContext, prefix: string, defined: string): IState => {
    let currentState = context.states.length ? context.states[context.states.length - 1] : { name: "", state: DefinedState.NotSet, prefix: "", directive: DirectiveType.NotSet };
    let theState = currentState.state;

    //console.log(` - [${defined}] - ${theState} - ${currentState.name}`);
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
                    prefix,
                    directive: DirectiveType.Else
                });
                break;
            case DefinedState.NotDefined:
                context.states.push({
                    name: escapeName("!" + currentState.name),
                    state: DefinedState.Defined,
                    prefix,
                    directive: DirectiveType.Else
                });
                break;
            default:
                context.states.push({
                    name: currentState.name,
                    state: DefinedState.NotSet,
                    prefix,
                    directive: DirectiveType.Else
                });
                break;
        }
    } else if(defined.startsWith("ifdef ") || defined.startsWith("ifdef(")) {
        let name = defined.substring(5).trim();
        if (objHasOwn(context.defs, name)) {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix,
                directive: DirectiveType.IfDef
            });
        } else {
            context.states.push({
                name: escapeName("!" + name),
                state: DefinedState.NotDefined,
                prefix,
                directive: DirectiveType.IfDef
            });
        }
    } else if(defined.startsWith("ifndef ") || defined.startsWith("ifndef(")) {
        let name = defined.substring(6).trim();
        if (objHasOwn(context, name)) {
            context.states.push({
                name: escapeName("!" + name),
                state: DefinedState.NotDefined,
                prefix,
                directive: DirectiveType.IfNDef
            });
        } else {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix,
                directive: DirectiveType.IfNDef
            });
        }
    } else if(defined.startsWith("if ") || defined.startsWith("if(")) {
        let name = defined.substring(2).trim();
        if (evaluateIf(context, name)) {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix,
                directive: DirectiveType.If
            });
        } else {
            context.states.push({
                name: escapeName("!{" + name + "}"),
                state: DefinedState.NotDefined,
                prefix,
                directive: DirectiveType.If
            });
        }
    } else if ((defined.startsWith("elif ") || defined.startsWith("elif(")) && context.states.length > 0) {
        context.states.pop();
        let name = defined.substring(4).trim();
        if (evaluateIf(context, name)) {
            context.states.push({
                name: escapeName(name),
                state: DefinedState.Defined,
                prefix,
                directive: DirectiveType.Elif
            });
        } else {
            context.states.push({
                name: escapeName("!{" + name + "}"),
                state: DefinedState.NotDefined,
                prefix,
                directive: DirectiveType.Elif
            });
        }        
    } else if (defined.startsWith("define ")) {
        if (theState !== DefinedState.NotDefined) {
            let parts = defined.substring(7).split(" ");
            let name = parts[0].trim();
            let value: any = true;
            if (parts.length > 1) {
                value = parts.slice(1).join(" ").trim();
            }

            context.defs[name] = value;
            //console.log(` - Defining ${name} = ${value}`);
        }
    } else if (defined.startsWith("undef ")) {
        if (theState !== DefinedState.NotDefined) {
            let name = defined.substring(6).trim();
            delete context.defs[name];
            //console.log(` - Undefining ${name}`);
        }
    } else {
        console.error(`Unknown/Unsupported directive [${defined}]`);
    }

    return context.states.length ? context.states[context.states.length - 1] : { name: "", state: DefinedState.NotSet, prefix, directive: DirectiveType.NotSet };
}
