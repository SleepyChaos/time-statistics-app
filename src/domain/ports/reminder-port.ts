export type ReminderPermission = 'not-determined' | 'full-access' | 'denied' | 'restricted';

export interface ReminderItem {
  id: string;
  externalId: string;
  title: string;
  isCompleted: boolean;
  dueAt: number | null;
}

export interface ReminderPort {
  getAuthorizationStatus(): Promise<ReminderPermission>;
  requestFullAccess(): Promise<ReminderPermission>;
  fetchIncomplete(listIds?: string[]): Promise<ReminderItem[]>;
}
