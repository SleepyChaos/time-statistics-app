import { addLocalDays, defaultVisibleStartHour, startOfLocalDay } from './local-day';

describe('local day helpers', () => {
  it('returns the local start of day', () => {
    const timestamp = new Date(2026, 6, 31, 16, 42).getTime();
    expect(startOfLocalDay(timestamp)).toBe(new Date(2026, 6, 31, 0, 0).getTime());
  });

  it('moves by calendar day rather than fixed milliseconds', () => {
    const timestamp = new Date(2026, 6, 31, 0, 0).getTime();
    expect(addLocalDays(timestamp, 1)).toBe(new Date(2026, 7, 1, 0, 0).getTime());
  });

  it('keeps the six-hour window within the day', () => {
    expect(defaultVisibleStartHour(new Date(2026, 6, 31, 1).getTime())).toBe(0);
    expect(defaultVisibleStartHour(new Date(2026, 6, 31, 12).getTime())).toBe(9);
    expect(defaultVisibleStartHour(new Date(2026, 6, 31, 23).getTime())).toBe(18);
  });
});
