
<h1 align="center">@nevware21 ts-async</h1>
<h2 align="center">Promise support implementations and helpers for TypeScriptbuilt for minification</h2>

![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/nevware21/ts-async/ci.yml?branch=main)
[![codecov](https://codecov.io/gh/nevware21/ts-async/branch/main/graph/badge.svg?token=KA05820FMO)](https://codecov.io/gh/nevware21/ts-async)
[![npm version](https://badge.fury.io/js/%40nevware21%2Fts-async.svg)](https://badge.fury.io/js/%40nevware21%2Fts-async)
[![downloads](https://img.shields.io/npm/dt/%40nevware21/ts-async.svg)](https://www.npmjs.com/package/%40nevware21/ts-async)
[![downloads](https://img.shields.io/npm/dm/%40nevware21/ts-async.svg)](https://www.npmjs.com/package/%40nevware21/ts-async)

## Description

This library provides Promise implementations (synchronous, idle, asynchronous and native), helpers and aliases built and tested using TypeScript. Apart from providing idle and synchronous implementations the primary focus is on supporting the creation of production code that can be better minified (resulting in a smaller runtime payload).

Provided implementations:
- Idle processing
- Synchronous processing
- Asynchronous processing
- Native runtime wrapper

The primary helpers are
- `createPromise` - Uses the current promise implementation set via `setCreatePromiseImpl` (defaults to createNativePromise)
- `createNativePromise` - This is a wrapper around the runtime `Promise` class that adds a `status` property, so this is effectivly the same as `new Promise(...)` but as a non-namespaced function it can be heavily minified to something like `a(...)`
- `createAsyncPromise` - Implements the `Promise` contract and uses timeouts (defaults to 0ms, but can also be provided) to process any chained promises (of any type)
- `createSyncPromise` - Also implements the `Promise` contract but will immediately execute any chained promises at the point of the original promise getting resolved or rejected, or if already resolved, rejected then at the point of registering the `then`, `catch` or `finally`
- `createIdlePromise` - Implements the `Promise` contract and will process any chained promises using the available `requestIdleCallback` (with no timeout by default - but can also be changes by `setDetaultIdlePromiseTimeout`). And when `requestIdleCallback` is not supported this will default to using a timeout via the [`scheduleIdleCallback` from `@nevware21/ts-utils`](https://nevware21.github.io/ts-utils/typedoc/functions/scheduleIdleCallback.html)
- `doAwait` - Helper which handles `await` "handling" via callback functions to avoid the TypeScript boilerplate code that is added for multiple branches. Has 3 callback options for `resolved`, `rejected` and `finally` cases all are optional.
- `doAwaitResponse` - Helper which handles `await` "handling" via a single callback where `resolved` and `rejected` cases are handled by the same callback, this receives an `AwaitResponse` object that provides the `value` or `reason` and a flag indicating whether the Promise was `rejected`)
- `doFinally` - Helper to provide `finally` handling for any promise using a callback implementation, analogous to using `try` / `finally` around an `await` function or using the `finally` on the promise directly

All promise implementations are validated using TypeScript with `async` / `await` and the internal helper functions `doAwait`, `doFinally` and `doAwaitResponse` helpers. Usage of the `doAwait` is recommended as this will avoids the additional boiler plate code that is added by TypeScript when handling the branches in an `async` / `await` functions, this does of course mean that your calling functions will also need to handle this `async` operations via callbacks rather than just causing the code path to "halt" at the `await` and can therefore may be a little more complex (depending on your implementation), however, you are not restricted to only using `await` or `doAwait` they can be used together.

Also of note is that all implementations will "emit/dispatch" the unhandled promise rejections event (if supported by the runtime) using the standard runtime mechanisms. So any existing handlers for native (`new Promise`) unhandled rejections will also receive them from the `idle`, `sync` and `async` implementations. The only exception to this is when the runtime (like IE) doesn't support this event in those cases "if" an `onunhandledrejection` function is registered it will be called or failing that it will logged to the console (if possible).

The provided polyfill wrapper is build around the `asynchronous` promise implementation which is tested and validated against the standard native (`Promise()`) implementations for node, browser and web-worker to ensure compatibility.

## Documentation

Documentation [generated from source code](https://nevware21.github.io/ts-async/typedoc/index.html) via typedoc
