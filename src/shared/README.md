# Shared Code

This directory contains code that is shared across multiple features.

## Structure

```
shared/
├── components/
│   ├── ui/           # UI primitives (Button, Input, etc.)
│   └── media/        # Media components (Audio, Video)
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

## UI Components

| Component   | Import                             |
| ----------- | ---------------------------------- |
| Button      | `shared/components/ui/Button`      |
| Input       | `shared/components/ui/Input`       |
| InputOTP    | `shared/components/ui/InputOTP`    |
| ProgressBar | `shared/components/ui/ProgressBar` |

## Media Components

| Component           | Import                                        |
| ------------------- | --------------------------------------------- |
| AutoplayVideo       | `shared/components/media/AutoplayVideo`       |
| AnimatedAudioBubble | `shared/components/media/AnimatedAudioBubble` |
| AudioVisualizer     | `shared/components/media/AudioVisualizer`     |

## Other Shared Components

| Component                  | Purpose              |
| -------------------------- | -------------------- |
| ErrorBoundary              | React error boundary |
| OnboardingProgress         | Step indicator       |
| ServiceListingRemovalModal | Confirmation modal   |







