/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { emitEvent } from "../../../src/promise/event";

describe("emitEvent", () => {
    it("with non-window target with dispatchEvent", () => {
        let calledEvent: Event;
        let mockTarget = {
            dispatchEvent: (theEvent: Event) => {
                calledEvent = theEvent;
            }
        }

        emitEvent(mockTarget, "unhandledrejection", (theEvt) => {

        }, false);

        assert.notEqual(calledEvent, undefined, "The dispatch event should have been called");
    });

    it("with non-window target with onunhandledrejection", () => {
        let calledEvent: Event;
        let mockTarget = {
            onunhandledrejection: (theEvent: Event) => {
                calledEvent = theEvent;
            }
        }

        emitEvent(mockTarget, "unhandledrejection", (theEvt) => {

        }, false);

        assert.notEqual(calledEvent, undefined, "The dispatch event should have been called");
    });

    it("with non-window target with console.error fallback", () => {
        let calledEvent: Event;
        let consoleName: string;
        let orgConsole = console;

        try {
            // eslint-disable-next-line no-global-assign
            console = {
                error: (name: string, theEvent: Event) => {
                    consoleName = name;
                    calledEvent = theEvent;
                }
            } as any;

            emitEvent({}, "unhandledrejection", (theEvt) => {

            }, false);

            assert.notEqual(calledEvent, undefined, "The dispatch event should have been called");
            assert.equal(consoleName, "unhandledrejection", "check the event name");
        } finally {
            // eslint-disable-next-line no-global-assign
            console = orgConsole;
        }
    });

    it("with non-window target with console.log fallback", () => {
        let calledEvent: Event;
        let consoleName: string;
        let orgConsole = console;

        try {
            // eslint-disable-next-line no-global-assign
            console = {
                log: (name: string, theEvent: Event) => {
                    consoleName = name;
                    calledEvent = theEvent;
                }
            } as any;

            emitEvent({}, "unhandledrejection", (theEvt) => {

            }, false);

            assert.notEqual(calledEvent, undefined, "The dispatch event should have been called");
            assert.equal(consoleName, "unhandledrejection", "check the event name");
        } finally {
            // eslint-disable-next-line no-global-assign
            console = orgConsole;
        }
    });
});