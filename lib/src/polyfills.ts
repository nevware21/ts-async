/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createAsyncAllPromise, createAsyncAllSettledPromise, createAsyncRejectedPromise, createAsyncResolvedPromise } from "./promise/asyncPromise";
import { objForEachKey } from "@nevware21/ts-utils";
import { PolyPromise } from "./polyfills/promise";

declare var Promise: any;

(function () {
    const promisePolyfills = {
        "all": createAsyncAllPromise,
        "resolved": createAsyncResolvedPromise,
        "rejected": createAsyncRejectedPromise,
        "allSettled": createAsyncAllSettledPromise
    };

    if (!Promise) {
        Promise = PolyPromise;
    } else {
        // Add Object polyfills
        let PromiseClass = Promise;
        if (PromiseClass) {
            objForEachKey(promisePolyfills, (key, value) => {
                if (!PromiseClass[key]) {
                    PromiseClass[key] = value;
                }
            });
        }
    }
})();
