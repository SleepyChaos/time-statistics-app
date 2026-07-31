export interface ScheduleItem {
  id: string;
  source: 'local' | 'eventkit';
  externalId: string | null;
  externalCalendarId: string | null;
  title: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  colorArgb: string;
  occurrenceKey: string | null;
  createdAt: number;
  updatedAt: number;
}

