/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { DefinedState, DirectiveType } from "../constants";

export interface IState {
    name: string;
    state: DefinedState;
    prefix: string;
    directive: DirectiveType
}