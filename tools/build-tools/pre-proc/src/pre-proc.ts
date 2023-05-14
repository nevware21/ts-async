/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import * as globby from "globby";
import { arrForEach } from "@nevware21/ts-utils";
import { undefSrc } from "./undef";
import { IStateContext } from "./interfaces/IStateContext";
import { LineEnding, getLines } from "./getLines";
import { convertFile } from "./convertFile";

let preProcDef = "../pre-proc.json";
let repoRoot: string = "";
let sourceGroup: string;
let definitionGroup: string;
let cfgRepoRoot: string;
let restoreOnly: boolean;
let globalContext: IStateContext = {
    defs: {},
    states: []
};

function showHelp() {
    let scriptParts: string[]; //d
    let scriptName = process.argv[1];
    if (scriptName.indexOf("\\") !== -1) {
        scriptParts = scriptName.split("\\");
        scriptName = scriptParts[scriptParts.length - 1];
    } else if (scriptName.indexOf("/") !== -1) {
        scriptParts = scriptName.split("/");
        scriptName = scriptParts[scriptParts.length - 1];
    }

    console.log("");
    console.log(scriptName + " [<definitions> [<group>]] [-D <name>]*");
    console.log("--------------------------");
    console.log(" <group>          - Identifies the group of projects to process");
    console.log(" <definitions>    - Import the global group definitions");
    console.log(" -D <name>        - Define the named variable, can be specified more than once");
    console.log(" -C <config file> - The json config file to use");
    console.log(" -R <reopRoot>    - The repository root");
}

function parseArgs(): boolean {
    if (process.argv.length < 2) {
        console.error("!!! Invalid number of arguments -- " + process.argv.length);
        return false;
    }

    let idx = 2;
    while (idx < process.argv.length) {
        let theArg = process.argv[idx];
        if (theArg.startsWith("-")) {
            if (theArg === "-restore") {
                restoreOnly = true;
                console.info(" - Restoring File(s)");
            } else if(theArg === "-D") {
                idx++;
                if (idx < process.argv.length) {
                    let name = process.argv[idx];
                    globalContext.defs[name] = true;
                    console.log(` - Defining ${name}`);
                }
            } else if(theArg === "-C" || theArg === "-c") {
                idx++;
                if (idx < process.argv.length) {
                    preProcDef = process.argv[idx];
                    console.log(` - Config ${preProcDef}`);
                }
            } else if(theArg === "-R" || theArg === "-r") {
                idx++;
                if (idx < process.argv.length) {
                    cfgRepoRoot = process.argv[idx];
                    console.log(` - Repo Root ${cfgRepoRoot}`);
                }
            } else {
                console.error("!!! Unknown switch [" + theArg + "] detected");
                return false;
            }
        } else if (!definitionGroup) {
            definitionGroup = theArg;
            console.log(" - Using " + definitionGroup);
        } else if (!sourceGroup) {
            sourceGroup = theArg;
            console.log(" - Using " + sourceGroup);
        } else {
            console.error("!!! Invalid Argument [" + theArg + "] detected");
            return false;
        }

        idx++;
    }

    return true;
}

function removeTrailingComma(text: string): string {
    return text.replace(/,(\s*[}\],])/g, "$1");
}

function removeComments(text: string): string {
    return text.replace(/^\s*\/\/\s.*$/gm, "");
}

function getGroupDefinitions() {
    if (!fs.existsSync(preProcDef)) {
        console.error("!!! Unable to locate group definitions [" + path.join(process.cwd(), preProcDef) + "]");
        throw new Error("!!! Unable to locate group definitions.");
    } else {
        console.log("Using: " + path.join(process.cwd(), preProcDef));
    }

    var groupText = removeComments(removeTrailingComma(fs.readFileSync(preProcDef, "utf-8")));

    let groupJson = JSON.parse(groupText);
    repoRoot = path.join(process.cwd(), (cfgRepoRoot || groupJson.repoRoot || "")).replace(/\\/g, "/");
    console.log("Repo: " + repoRoot);

    let defaults = groupJson.default || {};

    if (!definitionGroup) {
        definitionGroup = defaults.definition || "";
    }

    let groupDefines = (groupJson.definitions || {})[definitionGroup] || {};
    Object.keys(groupDefines).forEach((key) => {
        if (!globalContext.defs[key]) {
            globalContext.defs[key] = groupDefines[key];
        }
    });

    if (!sourceGroup) {
        sourceGroup = defaults.group || "";
    }
    
    return (groupJson.groups || {})[sourceGroup] || [];
}

function processGroup(sourceRoot: string) {
    const files = globby.sync(path.join(sourceRoot, "./**/*.ts").replace(/\\/g, "/"));
    files.map((inputFile) => {
        console.debug("   - " + inputFile);
        let orgSrc = fs.readFileSync(inputFile, { encoding: "utf8" });

        let newSrc = undefSrc(orgSrc);
        if (!restoreOnly) {
            let lines = getLines(newSrc);
            if (convertFile(globalContext, lines)) {
                newSrc = "";
                arrForEach(lines, (theLine) => {
                    newSrc = newSrc + theLine.value;
                    switch (theLine.ending) {
                        case LineEnding.Unix:
                            newSrc += "\n";
                            break;
                        case LineEnding.Mac:
                            newSrc += "\r";
                            break;
                        case LineEnding.Win:
                            newSrc += "\r\n";
                            break;
                    }
                });
            }
        }

        if (newSrc != orgSrc) {
            // File Changed
            console.debug("     - Updating: " + inputFile);

            fs.writeFileSync(inputFile, newSrc, { encoding: "utf8" });
        }
    });
}

console.log("cwd: " + process.cwd());
if (parseArgs()) {
    var groupDef = getGroupDefinitions();

    console.log(`Process [${sourceGroup}] packages => ${groupDef.length}`);
    console.log(` - Defined: ${JSON.stringify(globalContext.defs, null, 4)}`);
    groupDef.forEach((groupRoot) => {
        let theRoot = path.join(repoRoot, groupRoot).replace(/\\/g, "/")
        console.log(` - ${theRoot}`);
        processGroup(theRoot);
    });
} else {
    showHelp();
    process.exit(1);
}
