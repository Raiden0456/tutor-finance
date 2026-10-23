import type { AiMessageStatus, AiPendingAction, AiRunError } from '@tutor-finance/shared';

export interface ToolActivity {
  key: number;
  name: string;
  status: 'started' | 'completed' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions: AiPendingAction[];
  status: AiMessageStatus;
  error: AiRunError | null;
  tools?: ToolActivity[];
}
