import type { TimelineEvent, DateRange } from '../types';

export interface TimelineProvider {
  source: string;
  getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]>;
}
