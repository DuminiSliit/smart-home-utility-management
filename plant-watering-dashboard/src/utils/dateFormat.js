const dateOf = value => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Unzoned API timestamps retain their reported wall-clock time.
// Zoned timestamps are displayed in the viewer's local timezone.
export function formatTimestamp(value) {
  const date = dateOf(value);
  if (!date) return 'Not available';
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  return `${day} · ${formatTime(date)}`;
}
export function formatTime(value, seconds = true) {
  const date = dateOf(value);
  return date ? new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: true,
  }).format(date) : '—';
}
