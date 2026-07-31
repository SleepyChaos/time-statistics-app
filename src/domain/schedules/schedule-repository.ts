import type { ScheduleItem } from '@/domain/schedules/schedule';

export interface CreateScheduleInput {
  title: string;
  startsAt: number;
  endsAt: number;
  isAllDay?: boolean;
  colorArgb?: string;
}

export interface ScheduleRepository {
  listRange(startsAt: number, endsAt: number): Promise<ScheduleItem[]>;
  create(input: CreateScheduleInput): Promise<ScheduleItem>;
  updateTime(id: string, startsAt: number, endsAt: number): Promise<void>;
  markOccurrence(id: string, occurrenceStartsAt: number, occurred: boolean): Promise<void>;
}

