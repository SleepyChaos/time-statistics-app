import { calculateViewUtilization, type TimelineSchedule } from './timeline';

function schedule(overrides: Partial<TimelineSchedule>): TimelineSchedule {
  return {
    id: 'schedule',
    source: 'local',
    title: '日程',
    startsAt: 0,
    endsAt: 10,
    isAllDay: false,
    colorArgb: '#7C83FF',
    isMarkedNotOccurred: false,
    ...overrides,
  };
}

describe('calculateViewUtilization', () => {
  it('merges effective slices and schedules without double counting', () => {
    expect(
      calculateViewUtilization({
        effectiveSlices: [{ startsAt: 0, endsAt: 20 }],
        schedules: [schedule({ startsAt: 10, endsAt: 30 })],
        window: { startsAt: 0, endsAt: 100 },
        now: 50,
      }),
    ).toEqual({ effectiveMs: 30, elapsedMs: 50, ratio: 0.6 });
  });

  it('excludes future, all-day and not-occurred schedules', () => {
    expect(
      calculateViewUtilization({
        effectiveSlices: [],
        schedules: [
          schedule({ startsAt: 60, endsAt: 70 }),
          schedule({ startsAt: 0, endsAt: 10, isAllDay: true }),
          schedule({ startsAt: 10, endsAt: 20, isMarkedNotOccurred: true }),
        ],
        window: { startsAt: 0, endsAt: 100 },
        now: 50,
      }),
    ).toEqual({ effectiveMs: 0, elapsedMs: 50, ratio: 0 });
  });

  it('clips an ongoing schedule at now', () => {
    expect(
      calculateViewUtilization({
        effectiveSlices: [],
        schedules: [schedule({ startsAt: 20, endsAt: 80 })],
        window: { startsAt: 0, endsAt: 100 },
        now: 50,
      }),
    ).toEqual({ effectiveMs: 30, elapsedMs: 50, ratio: 0.6 });
  });
});
