import type { TimerOptions } from "./engine";
import type { Scheduler, TaskStatus } from "./scheduler";

export class MockScheduler implements Scheduler {
	public deployedTimers: Map<string, TimerOptions> | null = null;
	public cleaned = false;
	public streamedLogsTaskId: string | null = null;
	public mockStatuses: TaskStatus[] = [];
	public statusCalled = false;

	async deploy(timers: Map<string, TimerOptions>): Promise<void> {
		this.deployedTimers = new Map(timers);
	}

	async clean(_timers: Map<string, TimerOptions>): Promise<void> {
		this.cleaned = true;
	}

	async status(timers: Map<string, TimerOptions>): Promise<TaskStatus[]> {
		this.statusCalled = true;
		if (this.mockStatuses.length > 0) {
			return this.mockStatuses;
		}
		return Array.from(timers.keys()).map((id) => ({
			id,
			unitName: `mock-${id}.timer`,
			activeState: "active",
			subState: "running",
			nextRun: "Mock Date",
		}));
	}

	async streamLogs(taskId: string): Promise<void> {
		this.streamedLogsTaskId = taskId;
	}
}
