/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 Nevware21
 * Licensed under the MIT license.
 */

import { arrForEach, arrIndexOf, createCustomError, CustomErrorConstructor, getLength, isPromiseLike, ITimerHandler, objDefine, objDefineProp, scheduleTimeout, utcNow } from "@nevware21/ts-utils";
import { doAwait, doAwaitResponse, doFinally } from "../promise/await";
import { _debugLog } from "../promise/debug";
import { IPromise } from "../interfaces/IPromise";
import { PromiseExecutor, RejectPromiseHandler, ResolvePromiseHandler,StartQueuedTaskFn } from "../interfaces/types";
import { ITaskDetail } from "../internal/ITaskDetail";
import { ITaskScheduler } from "../interfaces/ITaskScheduler";
import { createPromise } from "../promise/promise";

const REJECT = "reject";
const REJECTED_ERROR = "Rejected";

let _schedulerId: number = 0;
let _debugName: any;
let _debugIntState: any;

/**
 * @internal
 * @ignore
 */
let _customErrors: { [type: string]: CustomErrorConstructor } = {};

/**
 * @internal
 * @ignore
 * Internal structure for report the debugging state
 */
interface _InternalDebugState {
    l: ITaskDetail,
    r: ITaskDetail[],
    w: ITaskDetail[]
}

/**
 * @internal
 * @ignore
 * Empty reject function to avoid trying to re-reject
 */
const _rejectDone = () => {
    // A Do nothing function
}

var _createError = (type: string, evt: ITaskDetail, message?: string): Error => {
    // Lazily create the class
    !_customErrors[type] && (_customErrors[type] = createCustomError(type));

    let now = utcNow();
    return new (_customErrors[type])(`Task [${evt.id}] ${message||""}- ${(evt.st ? "Running" : "Waiting")}: ${_calcTime(now, evt.st || evt.cr)}`);
}

/**
 * @internal
 * @ignore
 * Internal function used for displaying the time in milliseconds (during debugging)
 * @param now - The current time
 * @param start - The start time to subtract
 * @returns A string representation of the time difference
 */
function _calcTime(now: number, start: number) {
    return ((now - start) || "0") + " ms";
}

/**
 * Abort any stale tasks in the provided task Queue
 * @param taskQueue - The Task Queue to search
 * @param staleTimeoutPeriod - The maxumum stale timeout period
 */
function _abortStaleTasks(taskQueue: ITaskDetail[], staleTimeoutPeriod: number): void {
    let now = utcNow();
    let expired = now - staleTimeoutPeriod;
    arrForEach(taskQueue, (evt) => {
        if (evt && !evt.rj && (evt.st && evt.st < expired) || (!evt.st && evt.cr && evt.cr < expired)) {
            evt && evt[REJECT](evt.rj || _createError("Aborted", evt, "Stale "));
        }
    });
}

/**
 * @internal
 * @ignore
 * Remove the `taskDetail` from the `queue` if present
 * @param queue - The Task Queue
 * @param taskDetail - The Task detail to be removed
 */
function _removeTask(queue: ITaskDetail[], taskDetail: ITaskDetail): void {
    let idx = arrIndexOf(queue, taskDetail);
    if (idx !== -1) {
        queue.splice(idx, 1);
    }
}

/**
 * @internal
 * @ignore Internal function to add the debug state to the promise, this code is removed from the production artifacts
 * @param theScheduler - The scheduler instance to add the debug accessors to.
 * @param nameFn - The function to return then name of this scheduler
 * @param stateFn - The function to return the internal state of the scheduler
 */
function _addDebugState(theScheduler: any, nameFn: () => string, stateFn: () => _InternalDebugState) {
    _debugName = _debugName || { toString: () => "[[SchedulerName]]" };
    _debugIntState = _debugIntState || { toString: () => "[[SchedulerState]]" };
    
    objDefineProp(theScheduler, _debugName, { get: nameFn });
    objDefineProp(theScheduler, _debugIntState, { get: stateFn });
}

/**
 * Create a Task Scheduler using the optional promise implementation and scheduler name.
 * The newPromise can be any value promise creation function, where the execution of the
 * queued tasks will be processed based on how the promise implementation processes it's
 * chained promises (asynchrounsly; synchronously; idle processing, etc)
 *
 * The functions used to start each task my return a result (synchronous execution) or an
 * {@link IPromise}, `PromiseLike` or `Promise` result (asynchronous execution).
 *
 * Each task is executed in the order that it was queued and the provided `startTask` function
 * will not be called until all previous tasks have completed (whther they resolve or reject).
 * The result from any previous task does not affect and is not passed to any later scheduled
 * task, if you need this capability then your `startTask` functions will need to co-operate to
 * share any common context.
 *
 * By default, queued tasks which have either been "waiting" to run or have been running longer
 * then 10 minutes will be Auto-Rejected to try and free up resources. If a task is running when
 * it rejected then it will continue to "run" based on whatever operation it's `startTask` is
 * performing. If a task has not yet had it's `startTask` function called it will never get called.
 * In both cases the `IPromise` returned by the call to {@link ITaskScheduler.queue | queue} the
 * task will be `rejected`. You can change this default time, including disabling completly via
 * the {@link ITaskScheduler.setStaleTimeout | setStaleTimeout}
 * function.
 * @since 0.2.0
 * @group Scheduler
 * @param newPromise - The function to use for creating a new promise when required, if not
 * provided this will default to {@link createPromise} which will use the default registered
 * promise creation function which defaults to runtime native promises or async Promise if not
 * supported by the runtime.
 * @param name - The name you want to associated with this scheduler, mostly useful for debugging
 * @returns A new ITaskScheduler instance
 * @example
 * ```ts
 * let scheduler = createTaskScheduler();
 *
 * // Schedule a task using the ts-async helper promise functions
 * scheduler.queue(() => {
 *     return createPromise((resolve, reject) => {
 *         scheduleTimeout(() => {
 *             // Do something after a delay
 *         }, 100);
 *     });
 * });
 *
 * // Schedule an asynchronous task which uses async/await
 * scheduler.queue(async () => {
 *     // This task will only execute after the previous task has completed
 *     await performAnotherAsyncTask();
 * });
 *
 * // Schedule a synchronous task that executes and completes immediately
 * scheduled.queue(() => {
 *     // Do some synchronous task
 *     return 42;
 * });
 *
 * // Schedule an asynchronous task which returns a promise
 * scheduled.queue(() => {
 *     return doAwait(fetch("https://github.com/nevware21/ts-async/blob/main/README.md"), (response) => {
 *         let theReadMe = response.text();
 *         // Do something with the readme
 *     });
 * });
 * ```
 */
export function createTaskScheduler(newPromise?: <T>(executor: PromiseExecutor<T>, timeout?: number) => IPromise<T>, name?: string): ITaskScheduler {
    let _theTask: ITaskDetail;
    let _running: ITaskDetail[] = [];
    let _waiting: ITaskDetail[] = [];
    let _staleTimeoutPeriod = 600000;            // 10 Minutes
    let _staleTimeoutCheckPeriod = _staleTimeoutPeriod / 10;    // 1 Minute
    let _taskCount = 0;
    let _schedulerName = (name ? (name + ".") : "") + _schedulerId++;
    let _blockedTimer: ITimerHandler;

    // Make sure that a promise creator has been assigned
    newPromise = newPromise || createPromise;

    const _startBlockedTimer = () => {
        let hasTasks = (getLength(_running) + getLength(_waiting)) > 0;
        if (_staleTimeoutPeriod > 0) {
            if (!_blockedTimer) {
                // Only attempt to drop stale / blocked tasks if the timeout period is defined
                _blockedTimer = scheduleTimeout(() => {
                    _abortStaleTasks(_running, _staleTimeoutPeriod);
                    _abortStaleTasks(_waiting, _staleTimeoutPeriod);
                    _blockedTimer && (_blockedTimer.enabled = ((getLength(_running) + getLength(_waiting)) > 0));
                }, _staleTimeoutCheckPeriod);

                _blockedTimer.unref();
            }

            _blockedTimer && (_blockedTimer.enabled = hasTasks);
        } else {
            //#ifdef DEBUG
            _debugLog(_schedulerName, "Stale Timer disabled");
            //#endif
        }
    }

    const _queueTask = <T>(startAction: StartQueuedTaskFn<T>, taskName?: string, timeout?: number): IPromise<T> => {
        let taskId: string = _schedulerName + "." + _taskCount++;
        if (taskName) {
            taskId += "-(" + taskName + ")";
        }
       
        let newTask: ITaskDetail = {
            id: taskId,
            cr: utcNow(),
            to: timeout,
            [REJECT]: (reason: any) => {
                newTask.rj = reason || _createError(REJECTED_ERROR, newTask);
                newTask[REJECT] = _rejectDone;
            }
        };

        if (!_theTask) {
            // We don't have any currently running task, so just start the next task
            newTask.p = newPromise(_runTask(newTask, startAction));
        } else {
            // Start a new promise which will wait until all current active tasks are completed before starting
            // the new task, it does not resolve this scheduled task until after the new task is resolve to
            // ensure that all scheduled tasks are completed in the correct order
            newTask.p = _waitForPreviousTask(newTask, _theTask, startAction);
        }

        // Set this new task as the last one, so that any future tasks will wait for this one
        _theTask = newTask;

        return newTask.p;
    }

    const _runTask = <T>(taskDetail: ITaskDetail, startAction: StartQueuedTaskFn<T>): PromiseExecutor<T> => {
        taskDetail.st = utcNow();

        // There should only ever be a single "running" task, but using an array
        // for code reuse.
        _running.push(taskDetail);
        _startBlockedTimer();

        // Create and return the promise executor for this action
        return <T>(onTaskResolve: ResolvePromiseHandler<T>, onTaskReject: RejectPromiseHandler) => {
            const _promiseReject = (reason: any) => {
                taskDetail.rj = taskDetail.rj || reason || _createError(REJECTED_ERROR, taskDetail);
                taskDetail[REJECT] = _rejectDone;
                _doCleanup(taskDetail);
                onTaskResolve = null;
                onTaskReject && onTaskReject(reason);
                onTaskReject = null;
            }

            let taskId = taskDetail.id;

            if (taskDetail.rj) {
                // Already aborted / pre-rejected
                _promiseReject(taskDetail.rj);
            } else {
                //#ifdef DEBUG
                _debugLog(_schedulerName, "Task [" + taskId + "] Started after " + _calcTime(taskDetail.st, taskDetail.cr));
                //#endif
                taskDetail[REJECT] = _promiseReject;

                try {
                    let startResult = startAction(taskId);
                    if (taskDetail.to && isPromiseLike(startResult)) {
                        taskDetail.t = scheduleTimeout(() => {
                            _promiseReject(_createError("Timeout", taskDetail));
                        }, taskDetail.to);
                    }

                    doAwait(startResult, (theResult) => {
                        _doCleanup(taskDetail);
                        onTaskReject = null;
                        onTaskResolve && onTaskResolve(theResult as any);
                        onTaskResolve = null;
                    }, _promiseReject);
                } catch (e) {
                    _promiseReject(e);
                }
            }
        };
    }

    const _waitForPreviousTask = <T>(taskDetail: ITaskDetail, prevTask: ITaskDetail, startAction: StartQueuedTaskFn<T>): IPromise<T> => {
        _waiting.push(taskDetail);
        _startBlockedTimer();

        return newPromise((onWaitResolve, onWaitReject) => {
            let taskId = taskDetail.id;
            let prevTaskId = prevTask.id;

            //#ifdef DEBUG
            _debugLog(_schedulerName, "[" + taskId + "] is waiting for [" + prevTaskId + "] to complete before starting -- [" + _waiting.length + "] waiting");
            //#endif

            // Wait for the previous tasks to complete before starting this one.
            // This ensures the queue execution order and avoids removing tasks that
            // have not yet been started.
            doAwaitResponse(prevTask.p, () => {
                _removeTask(_waiting, taskDetail);
                _runTask(taskDetail, startAction)(onWaitResolve, onWaitReject);
            });
        });
    }

    const _doCleanup = (taskDetail: ITaskDetail) => {
        _removeTask(_running, taskDetail);

        // If there was a timeout stop and clear
        taskDetail.t && taskDetail.t.cancel();
        taskDetail.t = null;

        // Clear the matching current task now that it's complete
        if (_theTask && _theTask === taskDetail) {
            _theTask = null;
            if (getLength(_running) + getLength(_waiting) === 0) {
                _blockedTimer && _blockedTimer.cancel();
                _blockedTimer = null;
            }
        }
    }

    let theScheduler: ITaskScheduler =  {
        idle: true,
        queue: _queueTask,
        setStaleTimeout: (staleTimeout: number, staleCheckPeriod?: number) => {
            _blockedTimer && _blockedTimer.cancel();
            _blockedTimer = null;
            _staleTimeoutPeriod = staleTimeout;
            _staleTimeoutCheckPeriod = staleCheckPeriod || staleTimeout / 10;
            _startBlockedTimer();
        }
    };

    // Change the idle property to dynamic
    objDefine(theScheduler, "idle", {
        g: () => {
            return getLength(_running) + getLength(_waiting) === 0;
        }
    });

    _addDebugState(theScheduler, () => _schedulerName,
        () => {
            return {
                l: _theTask,
                r: _running,
                w: _waiting
            }
        });

    return theScheduler;
}
