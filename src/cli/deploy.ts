import { join } from 'path';
import type { TimerOptions } from '../core/engine';
import { parseSchedule } from '../parser/schedule';
import { validateSchedule } from '../parser/validator';
import { generateServiceINI } from '../generator/service';
import { generateTimerINI } from '../generator/timer';
import { reloadDaemon, enableTimer } from '../utils/sysctl';

export async function deployUnits(name: string, scope: 'user' | 'system', timers: Map<string, TimerOptions>) {
  const targetDir = scope === 'user'
    ? join(Bun.env.HOME || '', '.config/systemd/user')
    : '/etc/systemd/system';

  console.log(`🔧 Generating systemd files in ${targetDir}...`);

  // Step 1: Generate and write all files to disk
  for (const [id, options] of timers.entries()) {
    const baseName = `${name}-${id}`;
    const rawSchedules = Array.isArray(options.every) ? options.every : [options.every];
    const schedules: string[] = [];

    for (const raw of rawSchedules) {
      const parsed = parseSchedule(raw);
      const isValid = await validateSchedule(parsed);
      if (!isValid) {
        console.error(`❌ Invalid calendar schedule generated: "${parsed}" from expression "${raw}"`);
        process.exit(1);
      }
      schedules.push(parsed);
    }

    const serviceContent = generateServiceINI(id, options, name);
    const timerContent = generateTimerINI(schedules, options, baseName);

    await Bun.write(join(targetDir, `${baseName}.service`), serviceContent);
    await Bun.write(join(targetDir, `${baseName}.timer`), timerContent);

    console.log(`✅ Created files for task: ${id}`);
  }

  // Step 2: Tell systemd to read the newly written files into memory
  console.log('🔄 Reloading systemd daemon to register new units...');
  await reloadDaemon(scope);

  // Step 3: Now that systemd is aware of them, enable and start the timers
  for (const id of timers.keys()) {
    const baseName = `${name}-${id}`;
    await enableTimer(baseName, scope);
    console.log(`🚀 Enabled and started timer: ${baseName}.timer`);
  }

  console.log('\n🌟 All timers deployed and synchronized successfully!');
}
