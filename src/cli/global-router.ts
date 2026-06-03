import type { MakeDirectoryOptions } from "node:fs";
import { existsSync } from "node:fs";
import { writeFile as fsWriteFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { TimerOptions } from "../core/engine";
import { SystemdScheduler } from "../core/systemd-scheduler";

export interface GlobalCLIOptions {
	args: string[];
	userConfigPath: string;
	readdir: (path: string) => Promise<string[]>;
	log: (msg: string) => void;
	logError: (msg: string) => void;
	exit: (code: number) => void;
	writeFile?: (path: string, content: string) => Promise<void>;
	exists?: (path: string) => Promise<boolean>;
	cwd?: () => string;
	mockChoice?: number;
	mockProjectName?: string;
	mkdir?: (path: string, options?: MakeDirectoryOptions) => Promise<void>;
	chmod?: (path: string, mode: number | string) => Promise<void>;
	stdin?: NodeJS.ReadStream;
	stdout?: NodeJS.WriteStream;
}

const templates = [
	{
		name: "Minimal Task (Periodic log heartbeat)",
		value: "minimal",
		boilerplate: (appName: string) => `#!/usr/bin/env bun
import { Stovetimer } from "stovetimer";

const app = new Stovetimer({
	name: "${appName}",
	scope: "user",
});

app.timer("ping", {
	every: "5 min",
	service: {
		description: "A minimal heartbeat task",
		run: async () => {
			console.log("Stovetimer heartbeat ping at " + new Date().toISOString());
		},
	},
});

app.start();
`,
	},
	{
		name: "Sandboxed Database Backup (Local & secure configuration)",
		value: "backup",
		boilerplate: (appName: string) => `#!/usr/bin/env bun
import { Stovetimer } from "stovetimer";

const app = new Stovetimer({
	name: "${appName}",
	scope: "user",
});

app.timer("backup-db", {
	every: "every day at 2am",
	persistent: true, // Recovers and runs if system was asleep/offline at scheduled time
	service: {
		description: "Daily database snapshot backup with sandbox protection",
		protectSystem: "strict", // Keeps root directory read-only to this task
		privateTmp: true,        // Isolates the task temporary directory
		run: async () => {
			console.log("Starting database backup dump...");
			// Your DB backup script/upload command goes here
			console.log("Database backup completed successfully.");
		},
	},
});

app.start();
`,
	},
	{
		name: "Web Scraper / API Synchronization (Periodic fetch)",
		value: "scraper",
		boilerplate: (appName: string) => `#!/usr/bin/env bun
import { Stovetimer } from "stovetimer";

const app = new Stovetimer({
	name: "${appName}",
	scope: "user",
});

app.timer("sync-api", {
	every: "30 min",
	service: {
		description: "Periodic API synchronization task",
		protectSystem: "strict",
		privateTmp: true,
		run: async () => {
			console.log("Syncing remote endpoint data...");
			const response = await fetch("https://api.github.com/repos/threehymns/stovetimer");
			const json = await response.json();
			console.log("Latest stargazers count: " + json.stargazers_count);
		},
	},
});

app.start();
`,
	},
];

async function _promptTextInput(
	question: string,
	defaultValue: string,
	stdin: NodeJS.ReadStream = process.stdin,
	stdout: NodeJS.WriteStream = process.stdout,
): Promise<string> {
	if (!stdin.isTTY || process.env.NODE_ENV === "test" || process.env.BUN_TEST) {
		return defaultValue;
	}

	return new Promise<string>((resolve) => {
		let value = "";
		stdout.write(
			`\r\x1b[36m? ${question}\x1b[0m \x1b[90m(${defaultValue})\x1b[0m `,
		);

		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		const onData = (key: string) => {
			if (key === "\u0003") {
				// Ctrl+C
				stdin.removeListener("data", onData);
				stdin.setRawMode(false);
				stdin.pause();
				process.exit(130);
			}

			if (key === "\r" || key === "\n") {
				// Enter
				stdout.write("\n");
				stdin.removeListener("data", onData);
				stdin.setRawMode(false);
				stdin.pause();
				resolve(value.trim() || defaultValue);
				return;
			}

			if (key === "\u007f" || key === "\b") {
				// Backspace
				if (value.length > 0) {
					value = value.slice(0, -1);
					stdout.write("\b \b");
				}
			} else if (key.length === 1 && key.charCodeAt(0) >= 32) {
				value += key;
				stdout.write(key);
			}
		};

		stdin.on("data", onData);
	});
}

async function selectTemplateInteractive(
	prompt: string,
	options: string[],
	stdin: NodeJS.ReadStream = process.stdin,
	stdout: NodeJS.WriteStream = process.stdout,
): Promise<number> {
	if (!stdin.isTTY || process.env.NODE_ENV === "test" || process.env.BUN_TEST) {
		return 0; // Return minimal template by default if not a TTY
	}

	return new Promise<number>((resolve) => {
		let selected = 0;

		const render = () => {
			stdout.write(`\r\x1b[36m? ${prompt}\x1b[0m\n`);
			options.forEach((opt, idx) => {
				if (idx === selected) {
					stdout.write(`  \x1b[32m❯ ${opt}\x1b[0m\n`);
				} else {
					stdout.write(`    ${opt}\n`);
				}
			});
		};

		const cleanScreen = () => {
			stdout.write(`\r\x1b[K`); // Clear current line
			for (let i = 0; i < options.length; i++) {
				stdout.write(`\x1b[1A\x1b[K`); // Move up and clear
			}
			stdout.write(`\x1b[1A\x1b[K`); // Clear prompt line
		};

		// Set raw mode
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		render();

		const onData = (key: string) => {
			if (key === "\u0003") {
				// Ctrl+C
				cleanScreen();
				stdin.removeListener("data", onData);
				stdin.setRawMode(false);
				stdin.pause();
				process.exit(130);
			}

			if (key === "\r" || key === "\n") {
				// Enter
				cleanScreen();
				stdin.removeListener("data", onData);
				stdin.setRawMode(false);
				stdin.pause();
				resolve(selected);
				return;
			}

			if (key === "\u001b[A" || key === "k") {
				// Up arrow or k
				selected = (selected - 1 + options.length) % options.length;
				cleanScreen();
				render();
			} else if (key === "\u001b[B" || key === "j") {
				// Down arrow or j
				selected = (selected + 1) % options.length;
				cleanScreen();
				render();
			}
		};

		stdin.on("data", onData);
	});
}

export async function handleGlobalCLI(options: GlobalCLIOptions) {
	const { args, userConfigPath, readdir, log, logError, exit } = options;
	const command = args[0];

	// Optional helpers with defaults
	const activeCwd = options.cwd || process.cwd;
	const activeExists = options.exists || (async (p: string) => existsSync(p));
	const activeWriteFile =
		options.writeFile || (async (p: string, c: string) => fsWriteFile(p, c));
	const _activeMkdir =
		options.mkdir ||
		(async (p: string) => {
			if (options.writeFile) return; // Skip actual mkdir if writeFile is mocked
			const { mkdir } = await import("node:fs/promises");
			await mkdir(p, { recursive: true });
		});
	const activeChmod =
		options.chmod ||
		(async (p: string, m: number | string) => {
			if (options.writeFile) return; // Skip actual chmod if writeFile is mocked
			const { chmod } = await import("node:fs/promises");
			await chmod(p, m);
		});
	const activeStdin = options.stdin || process.stdin;
	const activeStdout = options.stdout || process.stdout;

	const isHelp =
		!command || command === "--help" || command === "-h" || command === "help";

	if (isHelp) {
		log(`
\x1b[35m📦 stovetimer Global Bin\x1b[0m
═════════════════════════════
Commands available anywhere:
  \x1b[34mstovetimer status\x1b[0m                 Queries all registered local timers
  \x1b[35mstovetimer logs [task-id]\x1b[0m         Streams log journals directly
  \x1b[32mstovetimer init [project-name]\x1b[0m    Scaffolds a tasks.ts file in a new or current directory
		`);
		exit(0);
		return;
	}

	if (command === "init") {
		// Identify app name and flags
		let appName = "";
		let force = false;

		for (let i = 1; i < args.length; i++) {
			const arg = args[i];
			if (arg === undefined) continue;
			if (arg === "--force" || arg === "-f") {
				force = true;
			} else if (!appName && !arg.startsWith("-")) {
				appName = arg;
			}
		}

		if (!appName) {
			appName = basename(activeCwd());
		}

		const targetFile = join(activeCwd(), "tasks.ts");
		const fileExists = await activeExists(targetFile);

		if (fileExists && !force) {
			logError(
				`\x1b[31m❌ Error: ${targetFile} already exists. Use --force or -f to overwrite.\x1b[0m`,
			);
			exit(1);
			return;
		}

		let selectedIdx = 0;
		if (options.mockChoice !== undefined) {
			selectedIdx = options.mockChoice;
		} else {
			selectedIdx = await selectTemplateInteractive(
				"Choose a starter boilerplate configuration template:",
				templates.map((t) => t.name),
				activeStdin,
				activeStdout,
			);
		}

		const chosenTemplate = templates[selectedIdx] || templates[0];
		if (!chosenTemplate) {
			logError("\x1b[31m❌ Error: No templates available.\x1b[0m");
			exit(1);
			return;
		}
		const boilerplate = chosenTemplate.boilerplate(appName);

		try {
			await activeWriteFile(targetFile, boilerplate);
			await activeChmod(targetFile, 0o755);
			log(
				`\x1b[32m✨ Created tasks.ts starter project successfully using template "${chosenTemplate.name}" with app name "${appName}"!\x1b[0m`,
			);
			exit(0);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			logError(
				`\x1b[31m❌ Error: Failed to write tasks.ts file: ${errorMessage}\x1b[0m`,
			);
			exit(1);
		}
		return;
	}

	let files: string[] = [];
	try {
		files = await readdir(userConfigPath);
	} catch {
		logError(
			"❌ Could not scan systemd user directories for active stovetimer services.",
		);
		exit(1);
		return;
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
		log(
			"\x1b[33mℹ️  No active stovetimer app configurations found deployed on this machine.\x1b[0m",
		);
		exit(0);
		return;
	}

	const primaryAppName = Array.from(registeredApps)[0];
	if (!primaryAppName) {
		exit(0);
		return;
	}

	const targetTask = args[1];

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

			log(
				`\n\x1b[35m📋 Status Dashboard for:\x1b[0m \x1b[1m${appName}\x1b[0m (\x1b[36muser\x1b[0m scope)`,
			);
			log("\x1b[90m═\x1b[0m".repeat(65));

			for (const stat of statuses) {
				const statusColor =
					stat.activeState === "active" ? "\x1b[32m" : "\x1b[31m";
				log(`🔹 \x1b[1mTask:\x1b[0m \x1b[36m${stat.id}\x1b[0m`);
				log(`   Unit:        ${stat.unitName}`);
				log(
					`   Status:      ${statusColor}${stat.activeState}\x1b[0m (${stat.subState})`,
				);
				log(`   Next Run:    \x1b[33m${stat.nextRun}\x1b[0m`);
				log("\x1b[90m─\x1b[0m".repeat(65));
			}
		}
	} else if (command === "logs") {
		if (!targetTask) {
			logError(
				"\x1b[31m❌ Error: Please specify a task ID to pull logs for.\x1b[0m",
			);
			exit(1);
			return;
		}
		const scheduler = new SystemdScheduler(primaryAppName, "user");
		await scheduler.streamLogs(targetTask);
	} else {
		log(`
\x1b[35m📦 stovetimer Global Bin\x1b[0m
═════════════════════════════
Detected App: \x1b[1m${primaryAppName}\x1b[0m

Commands available anywhere:
  \x1b[34mstovetimer status\x1b[0m                 Queries all registered local timers
  \x1b[35mstovetimer logs [task-id]\x1b[0m         Streams log journals directly
    `);
	}
}
