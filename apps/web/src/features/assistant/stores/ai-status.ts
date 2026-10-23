import type { AiStatusResponse } from '@tutor-finance/shared';
import { aiApi } from '../api';

export interface AiStatusState {
  status: AiStatusResponse | null;
  loaded: boolean;
  consentOpen: boolean;
}

let state: AiStatusState = { status: null, loaded: false, consentOpen: false };
const listeners = new Set<() => void>();
let inflight: Promise<AiStatusResponse | null> | null = null;
let consentWaiters: ((accepted: boolean) => void)[] = [];

export const SERVER_SNAPSHOT: AiStatusState = state;

function update(patch: Partial<AiStatusState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeAiStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAiStatusState() {
  return state;
}

export function setAiStatus(status: AiStatusResponse) {
  update({ status, loaded: true });
}

export function loadAiStatus(force = false): Promise<AiStatusResponse | null> {
  if (inflight) return inflight;
  if (!force && state.loaded) return Promise.resolve(state.status);
  inflight = aiApi
    .status()
    .then((status) => {
      setAiStatus(status);
      return status;
    })
    .catch(() => {
      update({ loaded: true });
      return state.status;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function requestConsent(): Promise<boolean> {
  if (state.status?.consentGiven) return Promise.resolve(true);
  update({ consentOpen: true });
  return new Promise((resolve) => consentWaiters.push(resolve));
}

export function settleConsent(accepted: boolean) {
  update({ consentOpen: false });
  consentWaiters.forEach((resolve) => resolve(accepted));
  consentWaiters = [];
}
