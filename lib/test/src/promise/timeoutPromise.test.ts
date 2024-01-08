/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { createTimeoutPromise } from "../../../src/promise/timeoutPromise";


describe("timeoutPromise", () => {
    it("validate resolve", async () => {
        const result = await createTimeoutPromise(1, true);
        assert.equal(result, "Timeout of 1ms exceeded");
    });

    it("validate reject", async () => {
        try {
            await createTimeoutPromise(1, false);
            assert.fail("Should have thrown");
        } catch (err) {
            assert.equal(err, "Timeout of 1ms exceeded");
        }
    });

    it("validate resolve with message", async () => {
        const result = await createTimeoutPromise(1, true, "Hello");
        assert.equal(result, "Hello");
    });

    it("validate reject with message", async () => {
        try {
            await createTimeoutPromise(1, false, "Hello");
            assert.fail("Should have thrown");
        } catch (err) {
            assert.equal(err, "Hello");
        }
    });
});