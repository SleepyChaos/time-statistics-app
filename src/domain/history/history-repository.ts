import type {
  BackfillDraft,
  HistoryRecordDetail,
  TrashedRecord,
} from '@/domain/history/history-record';

export interface CreateBackfillInput {
  startsAt: number;
  endsAt: number;
  eventId: string;
  reflection?: string;
}

export interface HistoryRepository {
  getDetail(recordId: string): Promise<HistoryRecordDetail | null>;
  deleteRecord(recordId: string): Promise<void>;
  listTrash(now?: number): Promise<TrashedRecord[]>;
  restoreRecord(recordId: string): Promise<void>;
  prepareBackfill(requestedAt: number, now?: number): Promise<BackfillDraft>;
  createBackfill(input: CreateBackfillInput): Promise<string>;
}

