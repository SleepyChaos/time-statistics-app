import type { EventCategory, TrackingEvent } from './event';

export interface CreateCategoryInput {
  name: string;
}

export interface CreateEventInput {
  categoryId: string;
  name: string;
  colorArgb: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  sortOrder?: number;
  deleted?: boolean;
}

export interface UpdateEventInput {
  id: string;
  name?: string;
  colorArgb?: string;
  sortOrder?: number;
  deleted?: boolean;
}

export interface EventRepository {
  listCategories(): Promise<EventCategory[]>;
  listAllCategories(): Promise<EventCategory[]>;
  listActiveEvents(): Promise<TrackingEvent[]>;
  listAllEvents(): Promise<TrackingEvent[]>;
  createCategory(input: CreateCategoryInput): Promise<EventCategory>;
  createEvent(input: CreateEventInput): Promise<TrackingEvent>;
  updateCategory(input: UpdateCategoryInput): Promise<void>;
  updateEvent(input: UpdateEventInput): Promise<void>;
  moveCategory(id: string, direction: -1 | 1): Promise<void>;
  moveEvent(id: string, direction: -1 | 1): Promise<void>;
}
