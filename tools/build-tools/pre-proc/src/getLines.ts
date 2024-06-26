/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export const enum LineEnding {
    None = 0,
    Unix = 1,       // LF
    Mac = 2,        // CR
    Win = 3        // CR/LF
}

export interface ILine {
    orgValue: string;
    value: string;
    idx: number;
    len: number;
    ending: LineEnding
}

export const getLines = (theValue) => {
    var value = "" + theValue;
    var lines: ILine[] = [];
    var idx = 0;
    var startIdx = 0;
    var eol = 0;

    while ((idx + eol) < value.length) {
        startIdx = idx + eol;
        idx += eol;
        eol = 0;

        while (idx < value.length && !(value[idx] === "\n" || value[idx] === "\r")) {
            idx++;
        }

        let ending: LineEnding = LineEnding.None;
        if (value.length > idx) {
            if (value[idx] === "\n") {
                eol = 1;
                ending = LineEnding.Unix;
            } else if(value[idx] === "\r") {
                eol = 1;
                ending = LineEnding.Mac;
                if (value.length > idx && value[idx + 1] === "\n") {
                    eol++;
                    ending = LineEnding.Win;
                }
            }
        }

        let theLine: string;
        let len = idx - startIdx;
        if (len > 0) {
            theLine = value.substring(startIdx, idx);
        }

        if (theLine || ending !== LineEnding.None) {
            lines.push({
                orgValue: theLine || "",
                value: theLine || "",
                idx: startIdx,
                len: len,
                ending: ending
            });
        }
    }

    return lines;
};
