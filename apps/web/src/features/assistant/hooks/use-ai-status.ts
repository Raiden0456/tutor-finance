import { useEffect, useSyncExternalStore } from 'react';
import {
  getAiStatusState,
  loadAiStatus,
  SERVER_SNAPSHOT,
  subscribeAiStatus,
} from '../stores/ai-status';

export function useAiStatus() {
  const state = useSyncExternalStore(subscribeAiStatus, getAiStatusState, () => SERVER_SNAPSHOT);
  useEffect(() => {
    void loadAiStatus();
  }, []);
  return state;
}
