/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { IState } from "./IState";

export interface IStateContext {
    defs: { [key: string]: any},
    states: IState[];
}