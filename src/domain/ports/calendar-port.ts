export type CalendarPermission = 'not-determined' | 'full-access' | 'denied' | 'restricted';

export interface CalendarOccurrence {
  id: string;
  externalId: string;
  title: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  colorArgb: string;
}

export interface CalendarPort {
  getAuthorizationStatus(): Promise<CalendarPermission>;
  requestFullAccess(): Promise<CalendarPermission>;
  fetchOccurrences(range: { startsAt: number; endsAt: number }): Promise<CalendarOccurrence[]>;
}
