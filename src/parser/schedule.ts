const DOW_MAP: Record<string, string> = {
  sun: 'Sun', sunday: 'Sun',
  mon: 'Mon', monday: 'Mon',
  tue: 'Tue', tuesday: 'Tue',
  wed: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat',
  weekdays: 'Mon..Fri',
  weekends: 'Sat,Sun'
};

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

function parseTime(timeStr: string): string | null {
  if (timeStr === 'midnight') return '00:00:00';
  if (timeStr === 'noon') return '12:00:00';

  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  const [_, hStr = '0', mStr, ampm] = match;
  let h = parseInt(hStr, 10);
  const m = mStr ? parseInt(mStr, 10) : 0;

  // Enforce valid clock bounds to prevent "25:00pm" bypasses
  if (ampm) {
    if (h < 1 || h > 12) return null; 
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
  } else {
    if (h < 0 || h > 23) return null;
  }

  if (m < 0 || m > 59) return null;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

export function parseSchedule(input: string): string {
  const clean = input.toLowerCase().trim().replace(/^every\s+/, '');

  // 1. Pass through standard systemd expressions
  // (Return original input to preserve case formatting like Mon..Fri)
  if (['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'minutely'].includes(clean) || clean.includes('*')) {
    return input.trim(); 
  }

  // 2. Interval Shorthands
  const minMatch = clean.match(/^(\d+)\s*(m|min|minute)s?$/);
  if (minMatch?.[1]) return `*:0/${minMatch[1]}`;

  const hourMatch = clean.match(/^(\d+)\s*(h|hr|hour)s?$/);
  if (hourMatch?.[1]) return `0/${hourMatch[1]}:00:00`;

  const dayIntervalMatch = clean.match(/^(\d+)\s*(d|day)s?$/);
  if (dayIntervalMatch?.[1]) return `*-*-1/${dayIntervalMatch[1]} 00:00:00`;

  // 3. Complex Calendar & Clock Parsing
  let dayPart = '';
  let timePart = '';

  // Split logic based on "at" or presence of clock formats
  const atSplit = clean.split(/\s+at\s+/);
  if (atSplit.length === 2) {
    dayPart = (atSplit[0] ?? '').trim();
    timePart = (atSplit[1] ?? '').trim();
  } else if (clean.startsWith('at ')) {
    timePart = clean.replace(/^at\s+/, '').trim();
  } else {
    if (clean.match(/\d+(:\d+)?\s*(am|pm)/) || clean === 'midnight' || clean === 'noon') {
      timePart = clean; // Just a time string
    } else {
      dayPart = clean; // Just a day/date string
    }
  }

  // Evaluate the Day/Date part
  let sysDow = '';
  let sysDay = '*-*-*';

  if (dayPart) {
    const dow = DOW_MAP[dayPart];
    if (dow) {
      sysDow = dow;
    } else if (dayPart === 'day' || dayPart === 'everyday') {
      // Explicitly handle "every day" syntax. sysDow stays empty, sysDay stays wildcards.
    } else {
      const dateMatch = dayPart.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
      const monthKey = dateMatch?.[1] ?? '';
      const dayMatchStr = dateMatch?.[2] ?? '';
      const monthNum = MONTH_MAP[monthKey];

      if (dateMatch && monthNum && dayMatchStr) {
        sysDay = `*-${monthNum}-${dayMatchStr.padStart(2, '0')}`;
      } else {
        throw new Error(`[Stovetimer] Unsupported schedule format: "${input}"`);
      }
    }
  }

  // Evaluate the Time part
  let sysTime = '00:00:00';
  if (timePart) {
    const parsed = parseTime(timePart);
    if (!parsed) {
      throw new Error(`[Stovetimer] Unsupported time format in schedule: "${input}"`);
    }
    sysTime = parsed;
  }

  // Assemble systemd syntax
  const scheduleStr = sysDow ? `${sysDow} ${sysDay} ${sysTime}` : `${sysDay} ${sysTime}`;
  return scheduleStr.trim();
}
