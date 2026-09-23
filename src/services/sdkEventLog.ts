/**
 * A tiny in-memory event log for the FaceTec Device SDK's own lifecycle events
 * (UI_READY, CAPTURE_DONE, FV_RETRY, plus init/error) — module-level rather than
 * React state so any screen can push to it without prop-drilling a logger
 * through the whole tree. Purely observational: this never affects the flow,
 * it just makes the SDK's real behavior visible while we validate the
 * Device-SDK-only integration ahead of getting Server SDK credentials.
 */
export type SdkEventType = 'INIT' | 'UI_READY' | 'CAPTURE_DONE' | 'FV_RETRY' | 'ERROR';

export interface SdkEvent {
  id: string;
  type: SdkEventType;
  message: string;
  at: number;
}

const MAX_EVENTS = 30;
let events: SdkEvent[] = [];
const listeners = new Set<(events: SdkEvent[]) => void>();

export function logSdkEvent(type: SdkEventType, message: string): void {
  events = [...events, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, message, at: Date.now() }].slice(
    -MAX_EVENTS,
  );
  for (const listener of listeners) listener(events);
}

export function subscribeSdkEvents(listener: (events: SdkEvent[]) => void): () => void {
  listeners.add(listener);
  listener(events);
  return () => {
    listeners.delete(listener);
  };
}
