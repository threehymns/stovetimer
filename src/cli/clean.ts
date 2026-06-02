import { join } from 'path';
import { unlink } from 'fs/promises';
import type { TimerOptions } from '../core/engine';
import { reloadDaemon } from '../utils/sysctl';

export async function cleanUnits(name: string, scope: 'user' | 'system', timers: Map<string, TimerOptions>) {
  const targetDir = scope === 'user'
    ? join(Bun.env.HOME || '', '.config/systemd/user')
    : '/etc/systemd/system';

  const scopeArgs = scope === 'user' ? ['--user'] : [];
  console.log(`\x1b[33m🧹 Tearing down systemd units for app: ${name}...\x1b[0m`);

  for (const id of timers.keys()) {
    const baseName = `${name}-${id}`;
    
    try {
      // Stop and disable the timer natively
      const stopProc = Bun.spawn(['systemctl', ...scopeArgs, 'disable', '--now', `${baseName}.timer`], {
        stdout: 'ignore', stderr: 'ignore'
      });
      await stopProc.exited;

      // Delete the .timer and .service physical files
      await unlink(join(targetDir, `${baseName}.timer`)).catch(() => {});
      await unlink(join(targetDir, `${baseName}.service`)).catch(() => {});

      console.log(`\x1b[31m🗑️  Removed unit files for: ${id}\x1b[0m`);
    } catch (err) {
      console.error(`⚠️  Failed to cleanly remove files for ${id}:`, err);
    }
  }

  await reloadDaemon(scope);
  console.log('\x1b[32m✨ System files cleaned and systemd reloaded completely.\x1b[0m');
}
