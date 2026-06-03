#!/usr/bin/env bun
import { readdir } from 'fs/promises';
import { join } from 'path';
import { showStatus } from './status';
import { streamLogs } from './logs';

async function locateAndRunGlobalCommand() {
	const args = process.argv.slice(2);
	const command = args[0];
	const targetTask = args[1];

  const userConfigPath = join(Bun.env.HOME || '', '.config/systemd/user');

	let files: string[] = [];
	try {
		files = await readdir(userConfigPath);
	} catch {
    console.error('❌ Could not scan systemd user directories for active stovetimer services.');
		process.exit(1);
	}

	// Discover application names registered through unit structures
  const timerUnits = files.filter(f => f.endsWith('.timer'));
	const registeredApps = new Set<string>();
	const appTasksMap = new Map<string, string[]>();

  timerUnits.forEach(unit => {
		// Splits appname-taskname.timer
    const coreName = unit.replace('.timer', '');
    const dashIdx = coreName.indexOf('-');
		if (dashIdx > 0) {
			const appName = coreName.substring(0, dashIdx);
			const taskId = coreName.substring(dashIdx + 1);
			registeredApps.add(appName);

			if (!appTasksMap.has(appName)) appTasksMap.set(appName, []);
      appTasksMap.get(appName)!.push(taskId);
		}
	});

	if (registeredApps.size === 0) {
    console.log('\x1b[33mℹ️  No active stovetimer app configurations found deployed on this machine.\x1b[0m');
		process.exit(0);
	}

  const primaryAppName = Array.from(registeredApps)[0]!;

  if (command === 'status') {
    const virtualTimers = new Map();
    appTasksMap.get(primaryAppName)?.forEach(t => virtualTimers.set(t, {}));
    await showStatus(primaryAppName, 'user', virtualTimers);
  } else if (command === 'logs' && targetTask) {
    await streamLogs(primaryAppName, 'user', targetTask);
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
