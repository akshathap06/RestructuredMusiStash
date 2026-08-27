// Central feature toggles. Removed features (marketplace, messaging, legacy
// investing) were deleted from the codebase entirely — see README.md.
export const featureFlags = {
  PAPER_TRADING_ENABLED: true,
  AGENTIC_MANAGER_ENABLED: true,
  WAITLIST_ENABLED: true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
