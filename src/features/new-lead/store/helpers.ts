// Helper function to handle strict browser parsing and format dates consistently.
// The backend now returns timezone-aware ISO 8601 timestamps (with an offset),
// so we render them in the viewer's own local timezone. ISO 8601 formatting
// (en-CA date + 24-hour time) keeps the output stable across browser locales.

// Short label for the viewer's local timezone (e.g. "GMT+3", "EAT", "PST").
const getLocalTimeZoneLabel = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
};

export const formatTiming = (rawDateStr: string, separator: string = ' - ', appendTimezone: boolean = false): string => {
  if (!rawDateStr) return 'Unknown time';
  const safeDateStr = rawDateStr.replace(' ', 'T');
  const date = new Date(safeDateStr);

  if (isNaN(date.getTime())) return rawDateStr;

  // ISO 8601: YYYY-MM-DD (en-CA) date and 24-hour HH:mm time, in the viewer's local timezone.
  const formattedDate = date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedString = `${formattedDate}${separator}${formattedTime}`;
  return appendTimezone ? `${formattedString} ${getLocalTimeZoneLabel(date)}`.trim() : formattedString;
};

// Formats a date-only value in the viewer's local timezone using ISO 8601
// (YYYY-MM-DD).
export const formatConsentDate = (rawDateStr?: string): string => {
  const date = rawDateStr ? new Date(rawDateStr.replace(' ', 'T')) : new Date();

  if (isNaN(date.getTime())) return rawDateStr ?? '';

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
