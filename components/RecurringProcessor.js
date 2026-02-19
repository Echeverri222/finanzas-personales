import { useRef, useEffect } from 'react';
import { useRecurring } from '../hooks/useRecurring';

/**
 * Runs recurring payment processing once per app load when user is ready.
 * Creates movimientos for today from pagos_recurrentes whose dia_mes matches.
 */
export default function RecurringProcessor() {
  const { processRecurringForToday } = useRecurring();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    processRecurringForToday();
  }, [processRecurringForToday]);

  return null;
}
