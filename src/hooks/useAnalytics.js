import { useCallback } from 'react';

const SESSION_ID = `vis_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Captures visitor engagement events (chapter transitions, 3D hotspot inspections,
 * voice vs text mode) and sends them to /api/analytics silently.
 */
export function useAnalytics() {
  const trackEvent = useCallback((type, payload = {}) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        type,
        payload,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Non-blocking telemetry
    });
  }, []);

  return { trackEvent, sessionId: SESSION_ID };
}
