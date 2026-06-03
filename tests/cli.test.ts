import { describe, expect, test } from "bun:test";
import { Stovetimer } from "../src/core/engine";
import { MockScheduler } from "../src/core/mock-scheduler";

describe("CLI Router integration with MockScheduler", () => {
	test("should route deploy command to scheduler.deploy", async () => {
		const mockScheduler = new MockScheduler();
		const app = new Stovetimer({
			name: "my-test-app",
			scheduler: mockScheduler,
		});

		app.timer("test-task", {
			every: "15 min",
			service: {
				description: "Test run description",
				run: () => {},
			},
		});

		await app.start(["deploy"]);

		expect(mockScheduler.deployedTimers).not.toBeNull();
		expect(mockScheduler.deployedTimers?.has("test-task")).toBe(true);
	});

	test("should route clean command to scheduler.clean", async () => {
		const mockScheduler = new MockScheduler();
		const app = new Stovetimer({
			name: "my-test-app",
			scheduler: mockScheduler,
		});

		await app.start(["clean"]);

		expect(mockScheduler.cleaned).toBe(true);
	});

	test("should route status command to scheduler.status", async () => {
		const mockScheduler = new MockScheduler();
		mockScheduler.mockStatuses = [
			{
				id: "test-task",
				unitName: "my-test-app-test-task.timer",
				activeState: "active",
				subState: "waiting",
				nextRun: "Mock Date Time",
			},
		];

		const app = new Stovetimer({
			name: "my-test-app",
			scheduler: mockScheduler,
		});

		app.timer("test-task", {
			every: "15 min",
			service: {
				description: "Test run description",
				run: () => {},
			},
		});

		await app.start(["status"]);
		// Verify status was actually queried
		expect(mockScheduler.statusCalled).toBe(true);
	});

	test("should route logs command to scheduler.streamLogs", async () => {
		const mockScheduler = new MockScheduler();
		const app = new Stovetimer({
			name: "my-test-app",
			scheduler: mockScheduler,
		});

		await app.start(["logs", "test-task"]);

		expect(mockScheduler.streamedLogsTaskId).toBe("test-task");
	});
});
