/*
 * @nevware21/ts-async
 * https://github.com/nevware21/ts-async
 *
 * Copyright (c) 2022 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITimerHandler } from "@nevware21/ts-utils";
import { IPromise } from "../interfaces/IPromise";

/**
 * @internal
 * @ignore
 * @since 0.2.0
 * @group Scheduler
 */
export interface ITaskDetail {
    /**
     * The unique identifier for this task
     */
    id: string;

    /**
     * The created time of the task
     */
    cr: number;

    /**
     * The Promise used to execute this task
     */
    p?: IPromise<any>;

    /**
     * The start time of this task
     */
    st?: number;

    /**
     * The optional timeout value for this task
     */
    to?: number;

    /**
     * The timeout handler for this task (if required)
     */
    t?: ITimerHandler;

    /**
     * The reject reason
     */
    rj?: any;

    /**
     * Notifiy this task that it should be rejected / aborted
     * @param reason - The reason why this task is being rejected
     */
    reject: (message: any) => void;
}