/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _normalizeTimeoutValue } from "../../../src/internal/timeout_helpers";

describe("_normalizeTimeoutValue", () => {
    it("should return the default when timeout is undefined", () => {
        assert.strictEqual(_normalizeTimeoutValue(undefined, 42), 42);
        assert.strictEqual(_normalizeTimeoutValue(undefined, undefined), undefined);
    });

    it("should return the numeric timeout directly", () => {
        assert.strictEqual(_normalizeTimeoutValue(100, 42), 100);
        assert.strictEqual(_normalizeTimeoutValue(0, 42), 0);
    });

    it("should unwrap a single-nested array to find the numeric timeout", () => {
        assert.strictEqual(_normalizeTimeoutValue([10], 42), 10);
    });

    it("should unwrap several levels of nested arrays", () => {
        assert.strictEqual(_normalizeTimeoutValue([[[10]]], 42), 10);
    });

    it("should fall back to the default when the array holds no numeric value", () => {
        assert.strictEqual(_normalizeTimeoutValue([], 42), 42);
        assert.strictEqual(_normalizeTimeoutValue([undefined], 42), 42);
        assert.strictEqual(_normalizeTimeoutValue(["not-a-number"], 42), 42);
    });

    it("should fall back to the default once the unwrap depth cap is exceeded", () => {
        // Nested 6 levels deep - one more than the 5 iteration cap - so no numeric value is ever found.
        let deeplyNested: any = 10;
        for (let i = 0; i < 6; i++) {
            deeplyNested = [deeplyNested];
        }

        assert.strictEqual(_normalizeTimeoutValue(deeplyNested, 42), 42);
    });

    it("should still find the numeric value when nested exactly at the depth cap", () => {
        let nested: any = 10;
        for (let i = 0; i < 5; i++) {
            nested = [nested];
        }

        assert.strictEqual(_normalizeTimeoutValue(nested, 42), 10);
    });

    it("should not hang or overflow the stack for a self-referential array", () => {
        let selfRef: any[] = [];
        selfRef[0] = selfRef;

        let start = Date.now();
        assert.strictEqual(_normalizeTimeoutValue(selfRef, 42), 42);
        assert.isTrue((Date.now() - start) < 1200, "Should return promptly rather than looping forever");
    });
});
