/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { assert } from "chai";
import { doAwait, doAwaitResponse } from "../../../src/promise/await";
import { arrForEach } from "@nevware21/ts-utils";
import { createAsyncResolvedPromise } from "../../../src/promise/asyncPromise";
import { isPromiseLike } from "@nevware21/ts-utils";

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
        let value = doAwait(testPromiseLike, (value) => {
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
            let value = doAwait(testPromiseLike, (value) => {
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
        let value = doAwaitResponse(testPromiseLike, (response) => {
            responseCalled = true;
            assert.equal(response.rejected, false);
            assert.equal(response.value, 42, "response value should receive the resolved value");
        });
        assert.equal(responseCalled, true, "response should have been called");
    });

    it("with synchronous rejected PromiseLike value but not Promise", () => {
        let testPromiseLike: PromiseLike<number> = new TestRejectedPromiseLike<number>((reject) => {
            reject(42);
        });

        let responseCalled = false;
        try {
            let value = doAwaitResponse(testPromiseLike, (response) => {
                responseCalled = true;
                assert.equal(response.rejected, true);
                assert.equal(response.value, undefined, "response value should be undefined");
                assert.equal(response.reason, 42, "response.reason should receive the rejected value");
            });
            assert.fail("Expected an exception to have been thrown");
        } catch (e) {
            assert.ok(true, "Expected an exception");
        }

        assert.equal(responseCalled, true, "response should have been called");
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