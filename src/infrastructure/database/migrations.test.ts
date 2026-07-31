import { databaseMigrations } from './migrations';

describe('database migrations', () => {
  it('uses contiguous, unique versions', () => {
    const versions = databaseMigrations.map((migration) => migration.version);
    expect(versions).toEqual(versions.map((_, index) => index + 1));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('keeps every migration non-empty', () => {
    expect(databaseMigrations.every((migration) => migration.sql.trim().length > 0)).toBe(true);
  });
});
