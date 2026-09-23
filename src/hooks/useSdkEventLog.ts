import { useEffect, useState } from 'react';
import { subscribeSdkEvents, type SdkEvent } from '../services/sdkEventLog';

export function useSdkEventLog(): SdkEvent[] {
  const [events, setEvents] = useState<SdkEvent[]>([]);
  useEffect(() => subscribeSdkEvents(setEvents), []);
  return events;
}
