/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

const UNDEF = /^(\s*)\/\/\s{0,1}#:(\([^\)]+\)){0,1}\s(.*)$/gm;

export const undefSrc = (src: string) => {
    return src.replace(UNDEF, (all, g1, g2, g3) => {
        //console.log(` - ${all} => ${g1 + g3}`);
        return g1 + g3;
    });
}
