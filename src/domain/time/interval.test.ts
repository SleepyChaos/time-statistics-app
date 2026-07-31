import {
  calculateUtilization,
  clipInterval,
  intervalsOverlap,
  mergeIntervals,
  sumIntervalDuration,
} from './interval';

describe('time intervals', () => {
  it('treats touching boundaries as non-overlapping', () => {
    expect(
      intervalsOverlap({ startsAt: 0, endsAt: 10 }, { startsAt: 10, endsAt: 20 }),
    ).toBe(false);
  });

  it('detects a real overlap', () => {
    expect(
      intervalsOverlap({ startsAt: 0, endsAt: 11 }, { startsAt: 10, endsAt: 20 }),
    ).toBe(true);
  });

  it('clips intervals to a query window', () => {
    expect(clipInterval({ startsAt: 0, endsAt: 20 }, { startsAt: 5, endsAt: 15 })).toEqual({
      startsAt: 5,
      endsAt: 15,
    });
  });

  it('merges overlapping and adjacent ranges without double counting', () => {
    expect(
      mergeIntervals([
        { startsAt: 20, endsAt: 30 },
        { startsAt: 0, endsAt: 10 },
        { startsAt: 8, endsAt: 20 },
      ]),
    ).toEqual([{ startsAt: 0, endsAt: 30 }]);
    expect(
      sumIntervalDuration([
        { startsAt: 0, endsAt: 10 },
        { startsAt: 5, endsAt: 15 },
      ]),
    ).toBe(15);
  });

  it('calculates utilization only across elapsed time', () => {
    expect(
      calculateUtilization(
        [
          { startsAt: 0, endsAt: 25 },
          { startsAt: 20, endsAt: 50 },
          { startsAt: 80, endsAt: 100 },
        ],
        { startsAt: 0, endsAt: 100 },
        50,
      ),
    ).toEqual({ effectiveMs: 50, elapsedMs: 50, ratio: 1 });
  });
});
