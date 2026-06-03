#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { TimerOptions } from "../core/engine";
import { SystemdScheduler } from "../core/systemd-scheduler";

async function locateAndRunGlobalCommand() {
	const args = process.argv.slice(2);
	const command = args[0];
	const targetTask = args[1];

	const userConfigPath = join(Bun.env.HOME || "", ".config/systemd/user");

	let files: string[] = [];
	try {
		files = await readdir(userConfigPath);
	} catch {
		console.error(
			"❌ Could not scan systemd user directories for active stovetimer services.",
		);
		process.exit(1);
	}

	// Discover application names registered through unit structures
	const timerUnits = files.filter((f) => f.endsWith(".timer"));
	const registeredApps = new Set<string>();
	const appTasksMap = new Map<string, string[]>();

	timerUnits.forEach((unit) => {
		// Splits appname-taskname.timer
		const coreName = unit.replace(".timer", "");
		const dashIdx = coreName.indexOf("-");
		if (dashIdx > 0) {
			const appName = coreName.substring(0, dashIdx);
			const taskId = coreName.substring(dashIdx + 1);
			registeredApps.add(appName);

			if (!appTasksMap.has(appName)) appTasksMap.set(appName, []);
			appTasksMap.get(appName)?.push(taskId);
		}
	});

	if (registeredApps.size === 0) {
		console.log(
			"\x1b[33mℹ️  No active stovetimer app configurations found deployed on this machine.\x1b[0m",
		);
		process.exit(0);
	}

	const primaryAppName = Array.from(registeredApps)[0];
	if (!primaryAppName) {
		process.exit(0);
	}

	if (command === "status") {
		for (const appName of registeredApps) {
			const scheduler = new SystemdScheduler(appName, "user");
			const virtualTimers = new Map<string, TimerOptions>();
			appTasksMap.get(appName)?.forEach((t) => {
				virtualTimers.set(t, {
					every: "",
					service: {
						description: "",
						run: () => {},
					},
				});
			});
			const statuses = await scheduler.status(virtualTimers);

			console.log(
				`\n\x1b[35m📋 Status Dashboard for:\x1b[0m \x1b[1m${appName}\x1b[0m (\x1b[36muser\x1b[0m scope)`,
			);
			console.log("\x1b[90m═\x1b[0m".repeat(65));

			for (const stat of statuses) {
				const statusColor =
					stat.activeState === "active" ? "\x1b[32m" : "\x1b[31m";
				console.log(`🔹 \x1b[1mTask:\x1b[0m \x1b[36m${stat.id}\x1b[0m`);
				console.log(`   Unit:        ${stat.unitName}`);
				console.log(
					`   Status:      ${statusColor}${stat.activeState}\x1b[0m (${stat.subState})`,
				);
				console.log(`   Next Run:    \x1b[33m${stat.nextRun}\x1b[0m`);
				console.log("\x1b[90m─\x1b[0m".repeat(65));
			}
		}
	} else if (command === "logs") {
		if (!targetTask) {
			console.error(
				"\x1b[31m❌ Error: Please specify a task ID to pull logs for.\x1b[0m",
			);
			process.exit(1);
		}
		const scheduler = new SystemdScheduler(primaryAppName, "user");
		await scheduler.streamLogs(targetTask);
	} else {
		console.log(`
\x1b[35m📦 stovetimer Global Bin\x1b[0m
═════════════════════════════
Detected App: \x1b[1m${primaryAppName}\x1b[0m

Commands available anywhere:
  \x1b[34mstovetimer status\x1b[0m                 Queries all registered local timers
  \x1b[35mstovetimer logs [task-id]\x1b[0m         Streams log journals directly
    `);
	}
}

locateAndRunGlobalCommand();
