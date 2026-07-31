import type { TimeInterval } from '@/domain/time/interval';
import type {
  TimelineSchedule,
  TimelineSlice,
  ViewUtilization,
} from '@/domain/timeline/timeline';

export interface TimelineSnapshot {
  slices: TimelineSlice[];
  schedules: TimelineSchedule[];
  utilization: ViewUtilization;
}

export interface TimelineRepository {
  getSnapshot(input: {
    displayWindow: TimeInterval;
    utilizationWindow: TimeInterval;
    now: number;
  }): Promise<TimelineSnapshot>;
}

