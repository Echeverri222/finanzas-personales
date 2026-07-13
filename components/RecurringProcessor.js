import { useRef, useEffect } from 'react';
import { useRecurring } from '../hooks/useRecurring';
import { useUser } from '../contexts/UserContext';

/**
 * Runs recurring payment processing once per app load when user is ready.
 * Creates movimientos for this month from pagos_recurrentes whose scheduled day has passed.
 * Waits for userProfile so we have usuario_id before running.
 */
export default function RecurringProcessor() {
  const { userProfile } = useUser();
  const { processRecurringForToday } = useRecurring();
  const didRun = useRef(false);

  useEffect(() => {
    if (!userProfile?.id || didRun.current) return;
    didRun.current = true;
    processRecurringForToday();
  }, [userProfile?.id, processRecurringForToday]);

  return null;
}
