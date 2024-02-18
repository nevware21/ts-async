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
export { IWhileState } from "./interfaces/IWhileState";
export { IPromiseResult } from "./interfaces/IPromiseResult";
export {
    ResolvedPromiseHandler, RejectedPromiseHandler, FinallyPromiseHandler, ResolvePromiseHandler, RejectPromiseHandler, PromiseExecutor,
    PromiseCreatorFn, StartQueuedTaskFn
} from "./interfaces/types"
export { doAwaitResponse, doAwait, doFinally } from "./promise/await";
export { setPromiseDebugState } from "./promise/debug";
export {
    createNativePromise, createNativeAllPromise, createNativeResolvedPromise, createNativeRejectedPromise,
    createNativeAllSettledPromise
} from "./promise/nativePromise";
export {
    createSyncPromise, createSyncAllPromise, createSyncResolvedPromise, createSyncRejectedPromise,
    createSyncAllSettledPromise
} from "./promise/syncPromise";
export {
    createIdlePromise, createIdleAllPromise, createIdleResolvedPromise, createIdleRejectedPromise,
    createIdleAllSettledPromise, setDefaultIdleTimeout
} from "./promise/idlePromise";
export {
    createAsyncPromise, createAsyncAllPromise, createAsyncResolvedPromise, createAsyncRejectedPromise,
    createAsyncAllSettledPromise
} from "./promise/asyncPromise";
export {
    createPromise, createAllPromise, createRejectedPromise, createResolvedPromise, createAllSettledPromise,
    setCreatePromiseImpl
} from "./promise/promise";

export { createTimeoutPromise } from "./promise/timeoutPromise";
export { arrForEachAsync } from "./helpers/arrForEachAsync";
export { doWhileAsync } from "./helpers/doWhileAsync";
export { iterForOfAsync } from "./helpers/iterForOfAsync";

// Task Scheduler
export { createTaskScheduler } from "./scheduler/taskScheduler";