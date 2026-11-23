import { describe, expect, it } from 'vitest';
import { compareDates, formatDate, formatPeriod, isPlaceholderDate } from '../../src/lib/dates';

const TBD = 'TODO(owner): start date';

describe('dates', () => {
  it('detects placeholders', () => {
    expect(isPlaceholderDate(TBD)).toBe(true);
    expect(isPlaceholderDate('2026-01')).toBe(false);
  });
  it('sorts ascending with placeholders oldest', () => {
    expect(['2026-03', TBD, '2019-05', '2026-01'].sort(compareDates)).toEqual([TBD, '2019-05', '2026-01', '2026-03']);
    expect(compareDates('2026-01', '2026-01')).toBe(0);
    expect(compareDates(TBD, 'TODO(owner): other')).toBe(0);
  });
  it.each([['2026-01', 'Jan 2026'], ['2026-03', 'Mar 2026'], ['2019-12', 'Dec 2019'], [TBD, 'Date TBD']])(
    'formats %s as %s', (input, expected) => expect(formatDate(input)).toBe(expected));
  it('formats periods', () => {
    expect(formatPeriod({ start: '2022-01' })).toBe('Jan 2022 – Present');
    expect(formatPeriod({ start: '2022-01', end: '2026-01' })).toBe('Jan 2022 – Jan 2026');
    expect(formatPeriod({ start: TBD })).toBe('Date TBD – Present');
  });
});
