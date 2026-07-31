export interface EventCategory {
  id: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  deletedAt: number | null;
}

export interface TrackingEvent {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  colorArgb: string;
  sortOrder: number;
  deletedAt: number | null;
}
