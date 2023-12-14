/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { assert, expect } from "chai";
import { doAwait, doAwaitResponse } from "../../../src/promise/await";
import { arrForEach } from "@nevware21/ts-utils";
import { isPromiseLike } from "@nevware21/ts-utils";
import sinon from "sinon";

describe("Validate doAwait", () => {
    it("Invalid/missing callbacks", () => {
        let value = doAwait<number>(1, null);
        assert.equal(value, 1);

        value = doAwait(42, undefined);
        assert.equal(value, 42);

        value = doAwait<number>(1, null, null);
        assert.equal(value, 1);

        value = doAwait(42, undefined, undefined);
        assert.equal(value, 42);

        value = doAwait(53, undefined, null);
        assert.equal(value, 53);

        value = doAwait<number>(1, null, null, null);
        assert.equal(value, 1);

        value = doAwait(42, undefined, undefined, undefined);
        assert.equal(value, 42);

        value = doAwait(53, undefined, null, null);
        assert.equal(value, 53);
    });

    it("null/undefined value", () => {
        doAwait(null, (value) => {
            assert.equal(value, null, "THe passed value is returned");
        }, (reason) => {
            assert.fail("Should not be called");
        });

        doAwait(undefined, (value) => {
            assert.equal(value, undefined, "THe passed value is returned");
        }, (reason) => {
            assert.fail("Should not be called");
        });
    });

    it("with values", () => {

        let values: any[] = [
            0, 1, 42, -1,
            "", "Hello", "Darkness",
            new Date(),
            new Error("Failed")
        ];

        arrForEach(values, (theValue) => {
            let finallyCalled = false;

            doAwait(theValue, (value) => {
                assert.equal(value, theValue, "THe passed value is returned");
            }, (reason) => {
                assert.fail("Should not be called");
            }, () => {
                finallyCalled = true;
            });
            assert.equal(finallyCalled, true, "Finally should have been called");
        });
    });

    it("with synchronous resolved PromiseLike value but not Promise", () => {
        let testPromiseLike: PromiseLike<number> = new TestPromiseLike<number>((resolve) => {
            resolve(42);
        });

        let finallyCalled = false;
        let resolveCalled = false;
        doAwait(testPromiseLike, (value) => {
            resolveCalled = true;
            assert.equal(value, 42, "resolve should receive the resolved value");
        }, (reason) => {
            assert.fail("Should not be called");
        }, () => {
            finallyCalled = true;
        });
        assert.equal(resolveCalled, true, "resolve should have been called");
        assert.equal(finallyCalled, true, "Finally should have been called");
    });

    it("with synchronous rejected PromiseLike value but not Promise", () => {
        let testPromiseLike: PromiseLike<number> = new TestRejectedPromiseLike<number>((reject) => {
            reject(42);
        });

        let finallyCalled = false;
        let rejectCalled = false;
        try {
            doAwait(testPromiseLike, (value) => {
                assert.fail("Should not be called");
            }, (reason) => {
                rejectCalled = true;
                assert.equal(reason, 42, "resolve should receive the rejected value");
            }, () => {
                finallyCalled = true;
            });
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            assert.ok(true, "Expected an exception");
        }

        assert.equal(rejectCalled, true, "reject should have been called");
        assert.equal(finallyCalled, true, "Finally should have been called");
    });
});

describe("Validate doAwaitResponse", () => {
    it("Invalid/missing callbacks", () => {
        let value = doAwaitResponse<number>(1, null as any);
        assert.equal(value, 1);

        value = doAwaitResponse(42, undefined as any);
        assert.equal(value, 42);
    });

    it("null/undefined value", () => {
        doAwaitResponse(null, (response) => {
            assert.equal(response.rejected, false);
            assert.equal(response.value, null, "The passed value is returned");
        });

        doAwaitResponse(undefined, (response) => {
            assert.equal(response.rejected, false);
            assert.equal(response.value, null, "The passed value is returned");
        });
    });

    it("with values", () => {

        let values: any[] = [
            0, 1, 42, -1,
            "", "Hello", "Darkness",
            new Date(),
            new Error("Failed")
        ];

        arrForEach(values, (theValue) => {
            doAwaitResponse(theValue, (response) => {
                assert.equal(response.rejected, false);
                assert.equal(response.value, theValue, "The passed value is returned");
            });
        });
    });

    it("with synchronous resolved PromiseLike value but not Promise", () => {
        let testPromiseLike: PromiseLike<number> = new TestPromiseLike<number>((resolve) => {
            resolve(42);
        });

        let responseCalled = false;
        doAwaitResponse(testPromiseLike, (response) => {
            responseCalled = true;
            assert.equal(response.rejected, false);
            assert.equal(response.value, 42, "response value should receive the resolved value");
        });
        assert.equal(responseCalled, true, "response should have been called");
    });

    it("with synchronous rejected PromiseLike value but not Promise", async () => {
        let testPromiseLike: PromiseLike<number> = new TestRejectedPromiseLike<number>((reject) => {
            reject(42);
        });

        let responseCalled = false;
        try {
            await doAwaitResponse(testPromiseLike, (response) => {
                responseCalled = true;
                assert.equal(response.rejected, true);
                assert.equal(response.value, undefined, "response value should be undefined");
                assert.equal(response.reason, 42, "response.reason should receive the rejected value");

                throw response.reason;
            });
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            assert.ok(true, "Expected an exception");
            assert.equal(e, 42);
        }

        assert.equal(responseCalled, true, "response should have been called");
    });

    it("should handle resolved promises", async () => {
        const mockCallback = sinon.fake();
        const promise = Promise.resolve("resolved");

        await doAwaitResponse(promise, mockCallback);

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            value: "resolved",
            rejected: false
        });
    });

    it("should handle rejected promises", async () => {
        const mockCallback = sinon.fake();
        const promise = Promise.reject("rejected");

        try {
            await doAwaitResponse(promise, mockCallback);
        } catch (e) {
            // Handle error
        }

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            rejected: true,
            reason: "rejected"
        });
    });

    it("should handle callbacks that return values", async () => {
        const mockCallback = sinon.fake.returns("callback return value");
        const promise = Promise.resolve("resolved");

        const result = await doAwaitResponse(promise, mockCallback);

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            value: "resolved",
            rejected: false
        });
        expect(result).to.equal("callback return value");
    });

    it ("should handle callbacks that return promises", async () => {
        const mockCallback = sinon.fake.returns(Promise.resolve("callback return value"));
        const promise = Promise.resolve("resolved");

        const result = await doAwaitResponse(promise, mockCallback);

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            value: "resolved",
            rejected: false
        });
        expect(result).to.equal("callback return value");
    });

    it("should handle callbacks that throw errors", async () => {
        const mockCallback = sinon.fake.throws("callback error");
        const promise = Promise.resolve("resolved");

        try {
            await doAwaitResponse(promise, mockCallback);
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            // Handle error
            assert.ok(true, "Expected an exception");
        }

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            value: "resolved",
            rejected: false
        });
    });

    it ("should handle callbacks that return rejected promises", async () => {
        const mockCallback = sinon.fake.returns(Promise.reject("callback error"));
        const promise = Promise.resolve("resolved");

        try {
            await doAwaitResponse(promise, mockCallback);
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            // Handle error
            assert.ok(true, "Expected an exception");
        }

        expect(mockCallback.calledOnce).to.be.true;
        expect(mockCallback.firstCall.args[0]).to.deep.equal({
            value: "resolved",
            rejected: false
        });
    });

    it ("Example with value", async () => {
        let value = doAwaitResponse(42, (value) => {
            if (!value.rejected) {
                assert.equal(value.value, 42, "The passed value is returned");
                return 53;
            } else {
                assert.fail("Should not be called");
            }
        });

        assert.equal(value, 53);
    });

    it("Example with synchronous resolved PromiseLike value but not Promise", async () => {
        let testPromiseLike: PromiseLike<number> = new TestPromiseLike<number>((resolve) => {
            resolve(42);
        });

        let value = await doAwaitResponse(testPromiseLike, (value) => {
            if (!value.rejected) {
                assert.equal(value.value, 42, "The passed value is returned");
                return 53;
            } else {
                assert.fail("Should not be called");
            }
        });

        assert.equal(value, 53);
    });

    it("Example with synchronous rejected PromiseLike value but not Promise", async () => {
        let testPromiseLike: PromiseLike<number> = new TestRejectedPromiseLike<number>((reject) => {
            reject(42);
        });

        try {
            await doAwaitResponse(testPromiseLike, (value) => {
                if (!value.rejected) {
                    assert.fail("Should not be called");
                } else {
                    assert.equal(value.reason, 42, "The passed value is returned");
                    throw 53;
                }
            });
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            assert.ok(true, "Expected an exception");
            assert.equal(e, 53);
        }
    });
});

class TestPromiseLike<T> implements PromiseLike<T> {

    private _value: T | PromiseLike<T>;

    constructor(executor: (resolve: (value: T | PromiseLike<T>) => void) => void) {
        executor((value: T | PromiseLike<T>) => {
            this._value = value;
        });
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
        return new TestPromiseLike<TResult1>((resolve: (value: TResult1) => void) => {
            //let result = isUndefined(onfulfilled) ? this._value : (isFunction(onfulfilled) ? onfulfilled(this._value) : onfulfilled);
                        
            let result: any = this._value;
            if (onfulfilled) {
                result = onfulfilled(result);
            }

            if (isPromiseLike(result)) {
                result.then(resolve as any)
            } else {
                resolve(result);
            }
        });
    }
}

class TestRejectedPromiseLike<T> implements PromiseLike<T> {

    private _value: T;

    constructor(executor: (resolve: (value: T) => void) => void) {
        executor((value: T) => {
            this._value = value;
        });
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
        return new TestRejectedPromiseLike<TResult1>((reject: (value: TResult1) => void) => {
            //let result = isUndefined(onfulfilled) ? this._value : (isFunction(onfulfilled) ? onfulfilled(this._value) : onfulfilled);
                        
            let result: any = this._value;
            if (onrejected) {
                result = onrejected(result);
            }

            reject(result);
        });
    }
}