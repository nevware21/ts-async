/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2023 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { arrForEachAsync } from "../../../src/helpers/arrForEachAsync";
import { arrSlice } from "@nevware21/ts-utils";
import { isPromiseLike } from "@nevware21/ts-utils";
import { createTimeoutPromise } from "../../../src/promise/timeoutPromise";
import { doAwait } from "../../../src/promise/await";

describe("Validate forEachAsync", () => {
    it ("null array", () => {
        let result = arrForEachAsync(null as any, (value, index) => {
            assert.fail("Should not be called");
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");
    });

    it ("undefined array", () => {
        let result = arrForEachAsync(undefined as any, (value, index) => {
            assert.fail("Should not be called");
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");
    });

    it ("empty array", () => {
        let result = arrForEachAsync([], (value, index) => {
            assert.fail("Should not be called");
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");
    });

    it("Synchronous example", () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, undefined, "The forEach loop was not canceled");

        assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, items);
    });

    it("Synchronous example", () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }
        });

        assert.equal(isPromiseLike(result), false, "The forEach loop did not return a promise");
        assert.equal(result, -1, "The forEach loop was canceled");
        
        assert.equal(copyItems.length, 6, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, arrSlice(items, 0, 6));
    });

    it("Asynchronous example using doAwait", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        return doAwait(result, (res) => {
            assert.equal(res, undefined, "The forEach loop was not canceled");

            assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
            assert.deepEqual(copyItems, items);
        });

    });

    it("Asynchronous example using await", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        let res = await result;

        assert.equal(res, undefined, "The forEach loop was not canceled");

        assert.equal(copyItems.length, items.length, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, items);
    });

    it("Asynchronous example using doAwait", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }

            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        return doAwait(result, (res) => {
            assert.equal(res, -1, "The forEach loop was not canceled");

            assert.equal(copyItems.length, 6, "The forEach loop did not iterate over all items");
            assert.deepEqual(copyItems, arrSlice(items, 0, 6));
        });

    });

    it("Asynchronous example using await and stopping iteration", async () => {
        const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10"];
        const copyItems: Array<string> = [];
        
        let result = arrForEachAsync(items, (value, index) => {
            copyItems.push(value);
            if (index === 5) {
                return -1; // Stop the iteration
            }

            return createTimeoutPromise(10, true);
        });

        assert.equal(isPromiseLike(result), true, "The forEach loop did not return a promise");
        let res = await result;
        
        assert.equal(res, -1, "The forEach loop was not canceled");

        assert.equal(copyItems.length, 6, "The forEach loop did not iterate over all items");
        assert.deepEqual(copyItems, arrSlice(items, 0, 6));
    });
});
