import { databaseMigrations } from './migrations';

describe('database migrations', () => {
  it('uses contiguous, unique versions', () => {
    expect(databaseMigrations.map((migration) => migration.version)).toEqual([1, 2, 3, 4]);
  });

  it('keeps every migration non-empty', () => {
    expect(databaseMigrations.every((migration) => migration.sql.trim().length > 0)).toBe(true);
  });
});
