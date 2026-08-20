# Analytics stub — Phase 6
# Wire to PostHog/Amplitude later. Safe no-op logger for now.

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export const analytics = {
  track(event: string, properties: AnalyticsProps = {}) {
    if (__DEV__) {
      console.log('[analytics]', event, properties);
    }
  },
};
