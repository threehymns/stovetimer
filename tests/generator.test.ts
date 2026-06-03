import { describe, expect, test } from "bun:test";
import type { TimerOptions } from "../src/core/engine";
import { generateServiceINI } from "../src/generator/service";
import { generateTimerINI } from "../src/generator/timer";

describe("Unit Configuration Generator", () => {
	test("should output structured service file", () => {
		const options: TimerOptions = {
			every: "15 min",
			service: {
				description: "Test task execution",
				protectSystem: "strict",
				privateTmp: true,
				run: () => {},
			},
		};
		const result = generateServiceINI("test-task", options, "test-app");
		expect(result).toContain("[Service]");
		expect(result).toContain("ProtectSystem=strict");
		expect(result).toContain("PrivateTmp=true");
		expect(result).toContain("run test-task");
	});

	test("should output a structured timer file matching inputs", () => {
		const options: TimerOptions = {
			every: "15 min",
			persistent: true,
			randomizedDelaySec: "5m",
			service: {
				description: "Test description",
				run: () => {},
			},
		};
		const result = generateTimerINI(["*:0/15"], options, "test-app-test-task");
		expect(result).toContain("[Timer]");
		expect(result).toContain("OnCalendar=*:0/15");
		expect(result).toContain("Persistent=true");
		expect(result).toContain("RandomizedDelaySec=5m");
		expect(result).toContain("Unit=test-app-test-task.service");
	});
});
