import type { Stovetimer } from '../core/engine';
import { deployUnits } from './deploy';
import { showStatus } from './status';
import { streamLogs } from './logs';
import { cleanUnits } from './clean';

export async function handleCLI(app: Stovetimer, name: string, scope: 'user' | 'system', timers: any) {
  const args = Bun.argv.slice(2);
  const command = args[0];
  const target = args[1];

  switch (command) {
    case 'run':
      if (!target) {
        console.error('\x1b[31m❌ Error: Please specify a task ID to run.\x1b[0m');
        process.exit(1);
      }
      await app.executeTask(target);
      break;

    case 'deploy':
      await deployUnits(name, scope, timers);
      break;

    case 'clean':
      await cleanUnits(name, scope, timers);
      break;

    case 'status':
      await showStatus(name, scope, timers);
      break;

    case 'logs':
      if (!target) {
        console.error('\x1b[31m❌ Error: Please specify a task ID to pull logs for.\x1b[0m');
        process.exit(1);
      }
      await streamLogs(name, scope, target);
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
