import { useEffect, useState } from 'react';
import { useApp } from '../store/appStore';

/**
 * True once the persisted state has loaded from IndexedDB. Prevents the UI from
 * flashing default/empty state before rehydration completes.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useApp.persist.hasHydrated());
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useApp.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
