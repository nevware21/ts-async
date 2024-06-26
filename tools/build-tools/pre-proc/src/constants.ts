/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export const enum DefinedState {
    NotSet = 0,
    Defined = 1,
    NotDefined = 2
}

export const enum DirectiveType {
    NotSet = 0,
    IfDef = 1,
    IfNDef = 2,
    EndIf = 3,
    If = 4,
    Else = 5,
    Elif = 6
}