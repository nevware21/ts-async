/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

export { AwaitResponse } from "./interfaces/await-response";
export { IPromise } from "./interfaces/IPromise";
export { ITaskScheduler } from "./interfaces/ITaskScheduler";
export {
    ResolvedPromiseHandler, RejectedPromiseHandler, FinallyPromiseHandler, ResolvePromiseHandler, RejectPromiseHandler, PromiseExecutor,
    PromiseCreatorFn, StartQueuedTaskFn
} from "./interfaces/types"
export { doAwaitResponse, doAwait, doFinally } from "./promise/await";
export { setPromiseDebugState } from "./promise/debug";
export {
    createNativePromise, createNativeAllPromise, createNativeResolvedPromise, createNativeRejectedPromise
} from "./promise/nativePromise";
export {
    createSyncPromise, createSyncAllPromise, createSyncResolvedPromise, createSyncRejectedPromise
} from "./promise/syncPromise";
export {
    createIdlePromise, createIdleAllPromise, createIdleResolvedPromise, createIdleRejectedPromise,
    setDetaultIdleTimeout
} from "./promise/idlePromise";
export {
    createAsyncPromise, createAsyncAllPromise, createAsyncResolvedPromise, createAsyncRejectedPromise
} from "./promise/asyncPromise";
export {
    createPromise, createAllPromise, createRejectedPromise, createResolvedPromise,
    setCreatePromiseImpl
} from "./promise/promise";

// Task Scheduler
export { createTaskScheduler } from "./scheduler/taskScheduler";