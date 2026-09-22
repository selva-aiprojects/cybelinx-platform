export interface DateTimeFormatOptions {
  locale?: string;
  includeTime?: boolean;
  timeZone?: string;
}

export function formatDateTime(
  date: Date | string | number,
  options: DateTimeFormatOptions = {}
): string {
  const { locale = 'en-IN', includeTime = false, timeZone = 'Asia/Kolkata' } = options;
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return '';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone,
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.second = '2-digit';
    formatOptions.hour12 = true;
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}

export function formatRelativeTime(date: Date | string | number, baseDate = new Date()): string {
  const target = new Date(date);
  if (isNaN(target.getTime())) {
    return '';
  }

  const elapsedSeconds = Math.round((target.getTime() - baseDate.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const units: Array<{ limit: number; unit: Intl.RelativeTimeFormatUnit; divisor: number }> = [
    { limit: 60, unit: 'second', divisor: 1 },
    { limit: 3600, unit: 'minute', divisor: 60 },
    { limit: 86400, unit: 'hour', divisor: 3600 },
    { limit: 604800, unit: 'day', divisor: 86400 },
    { limit: 2592000, unit: 'week', divisor: 604800 },
    { limit: 31536000, unit: 'month', divisor: 2592000 },
    { limit: Infinity, unit: 'year', divisor: 31536000 },
  ];

  const absSeconds = Math.abs(elapsedSeconds);
  for (const { limit, unit, divisor } of units) {
    if (absSeconds < limit) {
      const value = Math.round(elapsedSeconds / divisor);
      return rtf.format(value, unit);
    }
  }

  return formatDateTime(target);
}
