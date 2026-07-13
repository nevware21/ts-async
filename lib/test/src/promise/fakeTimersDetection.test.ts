/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as sinon from "sinon";
import { assert } from "@nevware21/tripwire";
import { IPromise } from "../../../src/interfaces/IPromise";
import { createSyncResolvedPromise } from "../../../src/promise/syncPromise";
import { setDisableFakeTimersDetection, setMaxSyncPromiseChainDepth } from "../../../src/promise/itemProcessor";

describe("Validate setDisableFakeTimersDetection()", () => {
    let clock: sinon.SinonFakeTimers | null;

    beforeEach(() => {
        // Force the synchronous chain guard to trip quickly so a deferred "hop" is always needed
        setMaxSyncPromiseChainDepth(3);
        clock = null;
    });

    afterEach(() => {
        setMaxSyncPromiseChainDepth();
        setDisableFakeTimersDetection();

        if (clock) {
            clock.restore();
            clock = null;
        }
    });

    // Same "recursive thenable" pattern used by syncChainDepth.test.ts -- each link resolves via
    // a new chained (already resolved) sync promise, which will trip the guard once deep enough.
    function _recursiveChain(value: number, remaining: number, log: number[]): IPromise<number> {
        return createSyncResolvedPromise(value).then((v) => {
            log.push(v);
            if (remaining <= 0) {
                return v;
            }

            return _recursiveChain(v + 1, remaining - 1, log);
        });
    }

    it("defers via a fake 0ms timeout (requiring an explicit clock tick) when fake timers are detected (default behavior)", async () => {
        clock = sinon.useFakeTimers();

        let log: number[] = [];
        let promise = _recursiveChain(0, 20, log) as IPromise<number>;

        // Draining real microtasks should NOT progress the chain -- the deferred continuation
        // was scheduled via the (fake) setTimeout, which only fires once the clock is ticked.
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(promise.state, "pending", "Expecting the chain to still be waiting on the fake timer");

        // Drain every (possibly repeatedly re-scheduled) fake 0ms timeout hop
        await clock.runAllAsync();

        assert.equal(promise.state, "resolved", "Expecting the chain to resolve once the fake timer has ticked");
        assert.equal(log.length, 21, "Expecting every link in the chain to have run");
    });

    it("always defers via a real microtask when fake timer detection is disabled", async () => {
        clock = sinon.useFakeTimers();
        setDisableFakeTimersDetection(true);

        let log: number[] = [];
        let promise = _recursiveChain(0, 20, log) as IPromise<number>;

        // No clock.tick() -- this should only be able to complete if the deferred
        // continuation is using a real microtask rather than the fake timer.
        let result = await promise;

        assert.equal(result, 20, "Expecting the final value to be the last resolved value");
        assert.equal(log.length, 21, "Expecting every link in the chain to have run");
    });

    it("restores the default (detection enabled) behavior when called with undefined", async () => {
        clock = sinon.useFakeTimers();
        setDisableFakeTimersDetection(true);
        setDisableFakeTimersDetection();

        let log: number[] = [];
        let promise = _recursiveChain(0, 20, log) as IPromise<number>;

        await Promise.resolve();
        await Promise.resolve();
        assert.equal(promise.state, "pending", "Expecting detection to be re-enabled, so the chain is stuck on the fake timer");

        await clock.runAllAsync();

        assert.equal(promise.state, "resolved", "Expecting the chain to resolve once the fake timer has ticked");
    });

    it("treats any truthy/falsy value the same as !!/! would (not just literal true/false)", async () => {
        clock = sinon.useFakeTimers();

        setDisableFakeTimersDetection(1 as any);
        let log1: number[] = [];
        let promise1 = _recursiveChain(0, 20, log1) as IPromise<number>;
        let result1 = await promise1;
        assert.equal(result1, 20, "Expecting a truthy value to disable detection, same as passing true");

        setDisableFakeTimersDetection(0 as any);
        let log2: number[] = [];
        let promise2 = _recursiveChain(0, 20, log2) as IPromise<number>;

        await Promise.resolve();
        await Promise.resolve();
        assert.equal(promise2.state, "pending", "Expecting a falsy value to re-enable detection, same as passing false");

        await clock.runAllAsync();
        assert.equal(promise2.state, "resolved");
    });
});
