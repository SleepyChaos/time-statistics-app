import {
  buildBackfillRange,
  cropSlicesToRange,
  DEFAULT_BACKFILL_DURATION_MS,
  trashExpiresAt,
  TRASH_RETENTION_MS,
} from './history-record';

describe('history record rules', () => {
  it('keeps trashed records recoverable for seven days', () => {
    expect(trashExpiresAt(100)).toBe(100 + TRASH_RETENTION_MS);
  });

  it('snaps a backfill start backward and uses fifteen minutes', () => {
    const requestedAt = new Date(2026, 6, 31, 14, 44).getTime();
    const now = new Date(2026, 6, 31, 16, 0).getTime();
    expect(buildBackfillRange(requestedAt, null, now)).toEqual({
      startsAt: new Date(2026, 6, 31, 14, 40).getTime(),
      endsAt: new Date(2026, 6, 31, 14, 40).getTime() + DEFAULT_BACKFILL_DURATION_MS,
    });
  });

  it('shortens a backfill at the next record boundary', () => {
    const requestedAt = new Date(2026, 6, 31, 14, 40).getTime();
    const nextRecord = new Date(2026, 6, 31, 14, 47).getTime();
    const now = new Date(2026, 6, 31, 16, 0).getTime();
    expect(buildBackfillRange(requestedAt, nextRecord, now).endsAt).toBe(nextRecord);
  });

  it('shortens a backfill at now and rejects future positions', () => {
    const requestedAt = new Date(2026, 6, 31, 14, 50).getTime();
    const now = new Date(2026, 6, 31, 14, 56).getTime();
    expect(buildBackfillRange(requestedAt, null, now).endsAt).toBe(now);
    expect(() => buildBackfillRange(now + 60_000, null, now)).toThrow(
      'BACKFILL_FUTURE_NOT_ALLOWED',
    );
  });

  it('crops slices while preserving pause boundaries', () => {
    expect(
      cropSlicesToRange(
        [
          { id: 'a', kind: 'effective', startsAt: 0, endsAt: 10 },
          { id: 'b', kind: 'paused', startsAt: 10, endsAt: 20 },
          { id: 'c', kind: 'effective', startsAt: 20, endsAt: 30 },
        ],
        5,
        25,
      ),
    ).toEqual([
      { id: 'a', kind: 'effective', startsAt: 5, endsAt: 10 },
      { id: 'b', kind: 'paused', startsAt: 10, endsAt: 20 },
      { id: 'c', kind: 'effective', startsAt: 20, endsAt: 25 },
    ]);
  });

  it('extends the outer slices when a range grows', () => {
    expect(
      cropSlicesToRange(
        [{ id: 'a', kind: 'effective', startsAt: 10, endsAt: 20 }],
        0,
        30,
      ),
    ).toEqual([{ id: 'a', kind: 'effective', startsAt: 0, endsAt: 30 }]);
  });
});
