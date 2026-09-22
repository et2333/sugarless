import { PendingIntentState } from './aiIntentTypes';

const TTL_MS = 10 * 60 * 1000;
const pendingByUser = new Map<string, PendingIntentState>();

export function getPendingIntent(userId: string): PendingIntentState | null {
  const state = pendingByUser.get(userId);
  if (!state) return null;
  if (Date.now() - state.createdAt > TTL_MS) {
    pendingByUser.delete(userId);
    return null;
  }
  return state;
}

export function setPendingIntent(userId: string, state: PendingIntentState): void {
  pendingByUser.set(userId, state);
}

export function clearPendingIntent(userId: string): void {
  pendingByUser.delete(userId);
}

export function clearExpiredPendingIntents(): void {
  const now = Date.now();
  for (const [userId, state] of pendingByUser.entries()) {
    if (now - state.createdAt > TTL_MS) pendingByUser.delete(userId);
  }
}

