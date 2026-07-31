import { applyTimelineDrag, conflictsWithRecords, pixelsToMilliseconds } from './timeline-edit';

describe('timeline drag editing', () => {
  const hourHeight = 60;
  const minute = 60_000;

  it('converts vertical movement to elapsed time', () => {
    expect(pixelsToMilliseconds(30, hourHeight)).toBe(30 * minute);
  });

  it('moves a record while preserving duration', () => {
    expect(
      applyTimelineDrag(
        { startsAt: 10 * minute, endsAt: 40 * minute },
        'body',
        5,
        hourHeight,
      ),
    ).toEqual({ startsAt: 15 * minute, endsAt: 45 * minute });
  });

  it('resizes an edge and keeps at least five minutes', () => {
    expect(
      applyTimelineDrag(
        { startsAt: 10 * minute, endsAt: 40 * minute },
        'start',
        40,
        hourHeight,
      ),
    ).toEqual({ startsAt: 35 * minute, endsAt: 40 * minute });
  });

  it('detects overlap with other records but ignores itself', () => {
    const occupied = [
      { recordId: 'self', startsAt: 0, endsAt: 20 },
      { recordId: 'other', startsAt: 30, endsAt: 40 },
    ];
    expect(conflictsWithRecords({ startsAt: 10, endsAt: 35 }, occupied, 'self')).toBe(true);
    expect(conflictsWithRecords({ startsAt: 10, endsAt: 30 }, occupied, 'self')).toBe(false);
  });
});
