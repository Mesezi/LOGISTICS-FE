'use client';

import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';

const subscribe = () => () => {};
const getSnapshot = () => format(new Date(), 'yyyy-MM-dd');
const getServerSnapshot = () => '';

export function useToday() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
