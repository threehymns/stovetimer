export async function reloadDaemon(scope: 'user' | 'system'): Promise<void> {
  const args = scope === 'user' ? ['--user', 'daemon-reload'] : ['daemon-reload'];
  const proc = Bun.spawn(['systemctl', ...args]);
  await proc.exited;
}

export async function enableTimer(baseName: string, scope: 'user' | 'system'): Promise<void> {
  const args = scope === 'user' ? ['--user', 'enable', '--now', `${baseName}.timer`] : ['enable', '--now', `${baseName}.timer`];
  const proc = Bun.spawn(['systemctl', ...args]);
  await proc.exited;
}
