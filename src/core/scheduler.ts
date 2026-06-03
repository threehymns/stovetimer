import type { TimerOptions } from "./engine";

export interface TaskStatus {
	id: string;
	unitName: string;
	activeState: string;
	subState: string;
	nextRun: string;
}

export interface Scheduler {
	deploy(timers: Map<string, TimerOptions>): Promise<void>;
	clean(timers: Map<string, TimerOptions>): Promise<void>;
	status(timers: Map<string, TimerOptions>): Promise<TaskStatus[]>;
	streamLogs(taskId: string): Promise<void>;
}
