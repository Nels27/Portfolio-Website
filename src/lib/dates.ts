// Dates are "YYYY-MM" strings. Never build a Date here: new Date('2026-03') is
// UTC and can display as the previous month.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isPlaceholderDate(date: string): boolean {
  return date.startsWith('TODO(owner)');
}

export function compareDates(a: string, b: string): number {
  const left = isPlaceholderDate(a) ? '' : a;
  const right = isPlaceholderDate(b) ? '' : b;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function formatDate(date: string): string {
  if (isPlaceholderDate(date)) return 'Date TBD';
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

export function formatPeriod(period: { start: string; end?: string }): string {
  return `${formatDate(period.start)} – ${period.end ? formatDate(period.end) : 'Present'}`;
}
