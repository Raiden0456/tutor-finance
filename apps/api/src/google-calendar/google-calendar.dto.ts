export interface CalendarConnectionStatus {
  hasGoogleAccount: boolean;
  hasCalendarScope: boolean;
  calendarEnabled: boolean;
  calendarUrl: string | null;
  lastSyncedAt: string | null;
  pendingJobs: number;
}

export interface CalendarConnectResponse {
  ok: true;
  calendarUrl: string;
}

export interface CalendarDisconnectDto {
  deleteRemoteCalendar?: boolean;
}

export interface CalendarDisconnectResponse {
  ok: true;
}

export interface CalendarSyncResponse {
  ok: true;
  queued: number;
}
