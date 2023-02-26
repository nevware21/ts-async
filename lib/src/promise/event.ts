/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { dumpObj, getDocument, getInst, getLazy, ILazyValue } from "@nevware21/ts-utils";

const DISPATCH_EVENT = "dispatchEvent";
let _hasInitEvent: ILazyValue<boolean>;

/**
 * @internal
 * @ignore
 * @param target
 * @param evtName
 * @param populateEvent
 * @param useNewEvent
 */
export function emitEvent(target: any, evtName: string, populateEvent: (theEvt: Event | any) => Event | any, useNewEvent: boolean) {

    let doc = getDocument();
    !_hasInitEvent && (_hasInitEvent = getLazy(() => {
        let evt: any;
        if (doc && doc.createEvent) {
            evt = doc.createEvent("Event");
        }
        
        return (!!evt && evt.initEvent);
    }));

    let theEvt: Event = _hasInitEvent.v ? doc.createEvent("Event") : (useNewEvent ? new Event(evtName) : {} as Event);
    populateEvent && populateEvent(theEvt);

    if (_hasInitEvent.v) {
        theEvt.initEvent(evtName, false, true);
    }

    if (theEvt && target[DISPATCH_EVENT]) {
        target[DISPATCH_EVENT](theEvt);
    } else {
        let handler = target["on" + evtName];
        if (handler) {
            handler(theEvt);
        } else {
            let theConsole = getInst("console");
            theConsole && (theConsole["error"] || theConsole["log"])(evtName, dumpObj(theEvt));
        }
    }
}
