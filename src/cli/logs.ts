export async function streamLogs(name: string, scope: 'user' | 'system', taskId: string) {
  const baseName = `${name}-${taskId}`;
  const scopeArgs = scope === 'user' ? ['--user'] : [];
  
  console.log(`\n📺 Streaming logs for unit: ${baseName}.service (Ctrl+C to stop)`);
  
  const proc = Bun.spawn(['journalctl', ...scopeArgs, '-u', `${baseName}.service`, '-f', '-o', 'cat']);
  await proc.exited;
}
