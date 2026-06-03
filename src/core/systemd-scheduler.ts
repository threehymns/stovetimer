import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { generateServiceINI } from "../generator/service";
import { generateTimerINI } from "../generator/timer";
import { parseSchedule } from "../parser/schedule";
import { validateSchedule } from "../parser/validator";
import type { TimerOptions } from "./engine";
import type { Scheduler, TaskStatus } from "./scheduler";

export class SystemdScheduler implements Scheduler {
	constructor(
		private name: string,
		private scope: "user" | "system",
	) {}

	private get targetDir(): string {
		return this.scope === "user"
			? join(Bun.env.HOME || "", ".config/systemd/user")
			: "/etc/systemd/system";
	}

	private get scopeArgs(): string[] {
		return this.scope === "user" ? ["--user"] : [];
	}

	private async reloadDaemon(): Promise<void> {
		const args =
			this.scope === "user" ? ["--user", "daemon-reload"] : ["daemon-reload"];
		const proc = Bun.spawn(["systemctl", ...args]);
		await proc.exited;
	}

	private async enableTimer(baseName: string): Promise<void> {
		const args =
			this.scope === "user"
				? ["--user", "enable", "--now", `${baseName}.timer`]
				: ["enable", "--now", `${baseName}.timer`];
		const proc = Bun.spawn(["systemctl", ...args]);
		await proc.exited;
	}

	async deploy(timers: Map<string, TimerOptions>): Promise<void> {
		console.log(`🔧 Validating timer schedules...`);
		const parsedTimersSchedules = new Map<string, string[]>();

		for (const [id, options] of timers.entries()) {
			const rawSchedules = Array.isArray(options.every)
				? options.every
				: [options.every];
			const schedules: string[] = [];

			for (const raw of rawSchedules) {
				const parsed = parseSchedule(raw);
				const isValid = await validateSchedule(parsed);
				if (!isValid) {
					console.error(
						`❌ Invalid calendar schedule generated: "${parsed}" from expression "${raw}"`,
					);
					process.exit(1);
				}
				schedules.push(parsed);
			}
			parsedTimersSchedules.set(id, schedules);
		}

		console.log(`🔧 Generating systemd files in ${this.targetDir}...`);

		for (const [id, options] of timers.entries()) {
			const baseName = `${this.name}-${id}`;
			const schedules = parsedTimersSchedules.get(id) || [];

			const serviceContent = generateServiceINI(id, options, this.name);
			const timerContent = generateTimerINI(schedules, options, baseName);

			await Bun.write(
				join(this.targetDir, `${baseName}.service`),
				serviceContent,
			);
			await Bun.write(join(this.targetDir, `${baseName}.timer`), timerContent);

			console.log(`✅ Created files for task: ${id}`);
		}

		console.log("🔄 Reloading systemd daemon to register new units...");
		await this.reloadDaemon();

		for (const id of timers.keys()) {
			const baseName = `${this.name}-${id}`;
			await this.enableTimer(baseName);
			console.log(`🚀 Enabled and started timer: ${baseName}.timer`);
		}

		console.log("\n🌟 All timers deployed and synchronized successfully!");
	}

	async clean(timers: Map<string, TimerOptions>): Promise<void> {
		console.log(
			`\x1b[33m🧹 Tearing down systemd units for app: ${this.name}...\x1b[0m`,
		);

		for (const id of timers.keys()) {
			const baseName = `${this.name}-${id}`;

			try {
				const stopProc = Bun.spawn(
					[
						"systemctl",
						...this.scopeArgs,
						"disable",
						"--now",
						`${baseName}.timer`,
					],
					{
						stdout: "ignore",
						stderr: "ignore",
					},
				);
				await stopProc.exited;

				await unlink(join(this.targetDir, `${baseName}.timer`)).catch(() => {});
				await unlink(join(this.targetDir, `${baseName}.service`)).catch(
					() => {},
				);

				console.log(`\x1b[31m🗑️  Removed unit files for: ${id}\x1b[0m`);
			} catch (err) {
				console.error(`⚠️  Failed to cleanly remove files for ${id}:`, err);
			}
		}

		await this.reloadDaemon();
		console.log(
			"\x1b[32m✨ System files cleaned and systemd reloaded completely.\x1b[0m",
		);
	}

	async status(timers: Map<string, TimerOptions>): Promise<TaskStatus[]> {
		const statuses: TaskStatus[] = [];

		for (const id of timers.keys()) {
			const baseName = `${this.name}-${id}`;
			const proc = Bun.spawn(
				[
					"systemctl",
					...this.scopeArgs,
					"show",
					`${baseName}.timer`,
					"--property=ActiveState",
					"--property=SubState",
					"--property=NextElapseUSecRealtime",
				],
				{
					stdout: "pipe",
				},
			);
			const output = await new Response(proc.stdout).text();

			let activeState = "unknown";
			let subState = "unknown";
			let nextRun = "unknown";

			output.split("\n").forEach((line) => {
				if (line.startsWith("ActiveState="))
					activeState = line.split("=")[1] || "unknown";
				if (line.startsWith("SubState="))
					subState = line.split("=")[1] || "unknown";
				if (line.startsWith("NextElapseUSecRealtime=")) {
					const val = line.split("=")[1];

					if (
						val &&
						val !== "0" &&
						val !== "" &&
						val !== "n/a" &&
						val !== "infinity"
					) {
						const microsecs = parseInt(val, 10);
						if (!Number.isNaN(microsecs)) {
							nextRun = new Date(microsecs / 1000).toLocaleString();
						} else {
							nextRun = val;
						}
					} else {
						nextRun = "Inactive / Waiting";
					}
				}
			});

			statuses.push({
				id,
				unitName: `${baseName}.timer`,
				activeState,
				subState,
				nextRun,
			});
		}

		return statuses;
	}

	async streamLogs(taskId: string): Promise<void> {
		const baseName = `${this.name}-${taskId}`;
		console.log(
			`\n📺 Streaming logs for unit: ${baseName}.service (Ctrl+C to stop)`,
		);
		const proc = Bun.spawn([
			"journalctl",
			...this.scopeArgs,
			"-u",
			`${baseName}.service`,
			"-f",
			"-o",
			"cat",
		]);
		await proc.exited;
	}
}
