/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "./IPromise";
import { StartQueuedTaskFn } from "./types";

/**
 * Defines a Task Scheduler that uses IPromise implementations to serialize the execution of the tasks.
 * Each added task will not get executed until the previous task has completed.
 * @since 0.2.0
 * @group Scheduler
 */
export interface ITaskScheduler {
    /**
     * Identifies if this scheduler is currently idle (`true`) or has waiting or currently processing tasks (`false`).
     * @example
     * ```ts
     * let scheduler = createTaskScheduler();
     *
     * // Check idle state
     * scheduler.idle;  // true
     *
     * let queuedTask = scheduler.queue(() => {
     *     // Return a promise
     *     return createPromise((resolve) => {
     *         // Wait some time then resolve
     *     });
     * });
     *
     * // Check idle state
     * scheduler.idle;  // false
     *
     * // Wait for the queued task to complete
     * await queuedTask;
     *
     * // Check idle state
     * scheduler.idle;  // true
     * ```
     */
    readonly idle: boolean;

    /**
     * Queue a task to be scheduled for execution, once the task has completed the returned IPromise
     * will be resolved / rejected
     * @param theTask - The function to call to start the task
     * @param taskName - The optional task name for the task, useful for debugging.
     * @param timeout - Specify a specific timeout for the task, the timeout will only apply once the task is started.
     * @returns A new promise that will be resolved (or rejected) once the task has been executed or aborted.
     * @example
     * ```ts
     * let scheduler = createTaskScheduler();
     *
     * // Schedule an async task, where the function returns a Promise or PromiseLike result
     * let queuedTask = scheduler.queue(runSomeAsyncTask());
     *
     * // Schedule an async task, where the function returns a Promise or PromiseLike result
     * let queuedTask2 = scheduler.queue(runAnotherAsyncTask());
     *
     * // Both queuedTask and queuedTask2 are Promise implementation (based on the type used by the scheduler)
     * // You can now treat these like any promose to wait for them to be resolve / rejected
     * // Somewhere else in your code using either `await`, `doAwait`, doAwaitResponse`, `doFinally`, `then`, `catch`
     * // or `finally`
     * doAwait(queuedTask, (result1) => {
     *     // queued task 1 is now complete
     *     // queued task 2 is now scheduled to run (or is already running)
     * });
     *
     * doAwait(queuedTask2, (result1) => {
     *     // Both task 1 and 2 have completed
     *     // As task 2 did not start until task 1 finished
     * });
     *
     * // This Will also work and will not cause a deadlock
     * // But task 2 will still not start until task 1 has completed
     * let task2Result = await queuedTask2;
     *
     * // Now get the task 1 response
     * let task1Result = await queuedTask1;
     * ```
     */
    queue: <T>(theTask: StartQueuedTaskFn<T>, taskName?: string, timeout?: number) => IPromise<T>;

    /**
     * Set the timeout to reject and remove any stale running tasks to avoid filling up memory
     * with blocked tasks.
     * @param staleTimeout - Identifies the maximum that a task can be running or waiting to start,
     * defaults to 10 minutes. If the value is set to zero or less the stale timeout will never
     * abort waiting tasks.
     * @param staleCheckPeriod - Identifes how oftem the queue's should be checked for stale tasks,
     * defaults to 1/10th of the staleTimeout when not specified. This directly sets the asynchronous
     * timeout value.
     * @example
     * ```ts
     * let secheduler = createTaskScheduler();
     *
     * // Set the stale task timeout to 1 second, this will check every 100ms
     * // for any long waiting / executing tasks and "reject" them.
     * scheduler.setStaleTimeout(1000);
     *
     * // Set the stale task timeout to 5 minutes (300 seconds), this will check every 1 minute (60 seconds)
     * // for any long waiting / executing tasks and "reject" them.
     * scheduler.setStaleTimeout(300000, 60000);
     * ```
     */
    setStaleTimeout: (staleTimeout: number, staleCheckPeriod?: number) => void;
}
