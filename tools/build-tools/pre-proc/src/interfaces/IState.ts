/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { DefinedState, DirectiveType } from "../constants";

export interface IState {
    name: string;
    state: DefinedState;
    prefix: string;
    directive: DirectiveType
}