import type { EventCategory, TrackingEvent } from './event';

export interface CreateCategoryInput {
  name: string;
}

export interface CreateEventInput {
  categoryId: string;
  name: string;
  colorArgb: string;
}

export interface EventRepository {
  listCategories(): Promise<EventCategory[]>;
  listActiveEvents(): Promise<TrackingEvent[]>;
  createCategory(input: CreateCategoryInput): Promise<EventCategory>;
  createEvent(input: CreateEventInput): Promise<TrackingEvent>;
}
