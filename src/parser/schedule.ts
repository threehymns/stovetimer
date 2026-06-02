export function parseSchedule(input: string): string {
  let clean = input.toLowerCase().trim();
  clean = clean.replace(/^every\s+/, '');

  if (['hourly', 'daily', 'weekly', 'monthly', 'minutely'].includes(clean) || clean.includes('*')) {
    return clean;
  }

  const minMatch = clean.match(/^(\d+)\s*(m|min|minute)s?$/);
  if (minMatch) return `*:0/${minMatch[1]}`;

  const hourMatch = clean.match(/^(\d+)\s*(h|hr|hour)s?$/);
  if (hourMatch) return `0/${hourMatch[1]}:00:00`;

  const timeMatch = clean.match(/^(?:at\s+)?(\d+):(\d+)\s*(am|pm)?$/);
  if (timeMatch) {
    let [_, hourStr, minute, ampm] = timeMatch;
    let hour = parseInt(hourStr!, 10);
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    return `*-*-* ${hour.toString().padStart(2, '0')}:${minute}:00`;
  }

  throw new Error(`[Stovetimer] Unsupported schedule format: "${input}"`);
}
