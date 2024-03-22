/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { arrForEach, objDeepCopy } from "@nevware21/ts-utils";
import { IStateContext } from "./interfaces/IStateContext";
import { ILine } from "./getLines";
import { processDirective } from "./processDirective";
import { IState } from "./interfaces/IState";
import { DefinedState, DirectiveType } from "./constants";

const IS_DIRECTIVE = /^(\s*)\/\/\s{0,1}#([^:].*)$/;

const calcState = (context: IStateContext): IState => {
    let name: string = "";
    let prefix: string = "";
    let theState: DefinedState = DefinedState.NotSet;
    let directive: DirectiveType = DirectiveType.NotSet;
    
    arrForEach(context.states, (state) => {
        // Any Not defined causes the remaining items to be bypassed
        if (state.state === DefinedState.NotDefined) {
            name = state.name;
            theState = DefinedState.NotDefined;
            prefix = state.prefix;
            directive = state.directive;
            return -1;
        }
    });

    return {
        name: name,
        state: theState,
        prefix: prefix || "",
        directive: directive
    }
}

const applyUndefined = (theState: IState, theLine: string) => {
    let prefix = theState.prefix;
    if (theLine.startsWith(prefix)) {
        if(theState.name) {
            return prefix + "//#:(" + theState.name + ") " + theLine.substring(prefix.length);
        }

        return prefix + "//#: " + theLine.substring(prefix.length);
    }

    return theLine.replace(/^(\s*)/, (all, g1) => {
        if (theState.name) {
            return g1 + "//#:(" + theState.name + ") ";
        }

        return g1 + "//#: ";
    });
}

export const convertFile = (baseContext: IStateContext, lines: ILine[]) => {
    let changed = false;
    let fileContext: IStateContext = {
        defs: objDeepCopy(baseContext.defs),
        states: []
    }
    let theState = calcState(fileContext);

    arrForEach(lines, (theLine) => {
        let value = theLine.value;
        let matches = IS_DIRECTIVE.exec(value);
        if (matches) {
            processDirective(fileContext, matches[1], matches[2].trim());
            // if (theState.state === DefinedState.NotDefined) {
            //     value = applyUndefined(theState, value);
            // }

            theState = calcState(fileContext);
        } else if (theState.state === DefinedState.NotDefined) {
            value = applyUndefined(theState, value);
        }

        if (value !== theLine.value) {
            //console.log(` => [${value}]`);
            theLine.value = value;
            changed = true;
        }
    });

    return changed;
}

