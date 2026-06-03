import type { Stovetimer, TimerOptions } from "../core/engine";
import type { Scheduler } from "../core/scheduler";

export async function handleCLI(
	app: Stovetimer,
	name: string,
	scope: "user" | "system",
	timers: Map<string, TimerOptions>,
	scheduler: Scheduler,
	args: string[],
) {
	const command = args[0];
	const target = args[1];

	switch (command) {
		case "run":
			if (!target) {
				console.error(
					"\x1b[31m❌ Error: Please specify a task ID to run.\x1b[0m",
				);
				process.exit(1);
			}
			await app.executeTask(target);
			break;

		case "deploy":
			await scheduler.deploy(timers);
			break;

		case "clean":
			await scheduler.clean(timers);
			break;

		case "status": {
			const statuses = await scheduler.status(timers);
			console.log(
				`\n\x1b[35m📋 Status Dashboard for:\x1b[0m \x1b[1m${name}\x1b[0m (\x1b[36m${scope}\x1b[0m scope)`,
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
			break;
		}

		case "logs":
			if (!target) {
				console.error(
					"\x1b[31m❌ Error: Please specify a task ID to pull logs for.\x1b[0m",
				);
				process.exit(1);
			}
			await scheduler.streamLogs(target);
			break;

		default:
			console.log(`
\x1b[36m🔥 stovetimer CLI\x1b[0m
═══════════════════════════════════════════
Usage inside a script project:
  bun tasks.ts [command] [arguments]

Usage as a global command:
  stovetimer status
  stovetimer logs [task-id]

Commands:
  \x1b[32mdeploy\x1b[0m              Compiles, writes, and activates systemd units
  \x1b[31mclean\x1b[0m               Disables, stops, and tears down installed systemd units
  \x1b[34mstatus\x1b[0m              Displays real-time status of all configured timers
  \x1b[35mlogs [task-id]\x1b[0m      Streams journald logging output for a given task
  \x1b[33mrun [task-id]\x1b[0m       Direct execution trigger used internally by systemd
      `);
			break;
	}
}
