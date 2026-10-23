export const DATA_CHANGED_EVENT = 'tf:data-changed';
export const ASSISTANT_OPEN_EVENT = 'tf:assistant-open';

export interface AssistantOpenRequest {
  studentId?: string;
  studentName?: string;
  prompt?: string;
}

export function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

export function openAssistant(request: AssistantOpenRequest = {}) {
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT, { detail: request }));
}
