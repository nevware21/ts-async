/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { IPromise } from "../../../src/interfaces/IPromise";
import { createSyncResolvedPromise } from "../../../src/promise/syncPromise";
import { setMaxSyncPromiseChainDepth } from "../../../src/promise/itemProcessor";

describe("Validate synchronous promise chain depth guard", () => {

    afterEach(() => {
        // Restore the default guard depth after each test so it doesn't leak into other test files
        setMaxSyncPromiseChainDepth();
    });

    // Builds a promise chain that recursively resolves itself by returning a new (already
    // resolved) chained promise from within the previous link's `then()` handler -- this is
    // the "recursive thenable" pattern that can grow the JS call stack by one or more frames
    // for every link when processed entirely synchronously.
    function _recursiveChain(value: number, remaining: number, log: number[]): IPromise<number> {
        return createSyncResolvedPromise(value).then((v) => {
            log.push(v);
            if (remaining <= 0) {
                return v;
            }

            return _recursiveChain(v + 1, remaining - 1, log);
        });
    }

    it("resolves a shallow recursively-chained promise entirely synchronously", () => {
        let log: number[] = [];
        let promise = _recursiveChain(0, 10, log) as IPromise<number>;

        assert.equal(promise.state, "resolved", "A shallow chain should complete synchronously (under the default guard depth)");
        assert.equal(log.length, 11, "Expecting all 11 links to have run");
    });

    it("does not overflow the call stack for a very deep recursively-chained promise", async function () {
        // Well beyond the default guard depth (200) -- generous timeout as this needs several
        // microtask hops to fully unwind, which can be slower on a heavily loaded machine/CI runner.
        this.timeout(30000);

        let log: number[] = [];
        let depth = 1500;
        let promise = _recursiveChain(0, depth, log) as IPromise<number>;

        let result = await promise;
        assert.equal(result, depth, "Expecting the final value to be the last resolved value");
        assert.equal(log.length, depth + 1, "Expecting every link in the chain to have run");
    });

    it("defers via a microtask once the configured maximum synchronous chain depth is exceeded", async () => {
        setMaxSyncPromiseChainDepth(3);

        let log: number[] = [];
        let promise = _recursiveChain(0, 20, log) as IPromise<number>;

        // With such a small configured depth the guard should have forced at least one
        // microtask hop before the whole chain could complete synchronously.
        assert.equal(promise.state, "pending", "Expecting the chain to not have completed synchronously");

        let result = await promise;
        assert.equal(result, 20, "Expecting the final value to be the last resolved value");
        assert.equal(log.length, 21, "Expecting every link in the chain to have run");
    });

    it("can disable the guard by passing zero (or a negative) maxDepth", () => {
        setMaxSyncPromiseChainDepth(0);

        let log: number[] = [];
        let promise = _recursiveChain(0, 300, log) as IPromise<number>;

        assert.equal(promise.state, "resolved", "Expecting the chain to complete synchronously when the guard is disabled");
        assert.equal(log.length, 301, "Expecting every link in the chain to have run");
    });

    it("resets back to the default depth when called without a value", () => {
        setMaxSyncPromiseChainDepth(2);
        setMaxSyncPromiseChainDepth();

        // The default (200) should comfortably allow a moderate chain to complete synchronously
        let log: number[] = [];
        let promise = _recursiveChain(0, 50, log) as IPromise<number>;

        assert.equal(promise.state, "resolved", "Expecting the default depth to be restored");
        assert.equal(log.length, 51, "Expecting every link in the chain to have run");
    });
});
