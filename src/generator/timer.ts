import type { TimerOptions } from '../core/engine';

export function generateTimerINI(schedules: string[], options: TimerOptions, baseName: string): string {
  const timerLines = schedules.map(s => `OnCalendar=${s}`).join('\n');
  const persistent = options.persistent ? 'Persistent=true' : 'Persistent=false';
  const randomizedDelay = options.randomizedDelaySec ? `RandomizedDelaySec=${options.randomizedDelaySec}` : '';

  return `[Unit]
Description=Timer for ${options.service.description}

[Timer]
${timerLines}
${persistent}
${randomizedDelay}
Unit=${baseName}.service

[Install]
WantedBy=timers.target
`;
}
