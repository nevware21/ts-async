/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { createAsyncPromise } from "../../../src/promise/asyncPromise";

describe("Validate createAsyncPromise() microtask timing", () => {
    it("should resolve using microtask queue by default", async () => {
        let callOrder: string[] = [];

        callOrder.push("1");
        createAsyncPromise<void>((resolve) => {
            resolve();
        }).then(() => {
            callOrder.push("3");
        });
        callOrder.push("2");

        assert.equal(callOrder.join(","), "1,2", "Promise callback should not run synchronously");

        await Promise.resolve();

        assert.equal(callOrder.join(","), "1,2,3", "Promise callback should run in the next microtask");
    });
});
