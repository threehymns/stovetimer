import type { TimerOptions } from '../core/engine';

export async function showStatus(name: string, scope: 'user' | 'system', timers: Map<string, TimerOptions>) {
  console.log(`\n\x1b[35m📋 Status Dashboard for:\x1b[0m \x1b[1m${name}\x1b[0m (\x1b[36m${scope}\x1b[0m scope)`);
  console.log('\x1b[90m═\x1b[0m'.repeat(65));

  const scopeArgs = scope === 'user' ? ['--user'] : [];

  for (const id of timers.keys()) {
    const baseName = `${name}-${id}`;
    const proc = Bun.spawn(['systemctl', ...scopeArgs, 'show', `${baseName}.timer`, '--property=ActiveState', '--property=SubState', '--property=NextElapseUSecRealtime'], {
      stdout: 'pipe'
    });
    const output = await new Response(proc.stdout).text();
    
    let activeState = 'unknown';
    let subState = 'unknown';
    let nextRun = 'unknown';

    output.split('\n').forEach(line => {
      if (line.startsWith('ActiveState=')) activeState = line.split('=')[1] || 'unknown';
      if (line.startsWith('SubState=')) subState = line.split('=')[1] || 'unknown';
      if (line.startsWith('NextElapseUSecRealtime=')) {
        const val = line.split('=')[1];
        
        if (val && val !== '0' && val !== '' && val !== 'n/a' && val !== 'infinity') {
          const microsecs = parseInt(val, 10);
          if (!Number.isNaN(microsecs)) {
            nextRun = new Date(microsecs / 1000).toLocaleString();
          } else {
            nextRun = val; // Fallback to raw string if parsing fails
          }
        } else {
          nextRun = '\x1b[90mInactive / Waiting\x1b[0m';
        }
      }
    });

    const statusColor = activeState === 'active' ? '\x1b[32m' : '\x1b[31m';

    console.log(`🔹 \x1b[1mTask:\x1b[0m \x1b[36m${id}\x1b[0m`);
    console.log(`   Unit:        ${baseName}.timer`);
    console.log(`   Status:      ${statusColor}${activeState}\x1b[0m (${subState})`);
    console.log(`   Next Run:    \x1b[33m${nextRun}\x1b[0m`);
    console.log('\x1b[90m─\x1b[0m'.repeat(65));
  }
}
