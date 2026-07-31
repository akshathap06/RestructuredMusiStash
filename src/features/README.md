# Feature Modules

This directory contains all feature-specific code organized by domain.

## Structure

Each feature folder contains:

- `screens/` - UI screen components
- `services/` - Business logic and API calls
- `components/` - Feature-specific components

## Features

| Folder               | Description                 |
| -------------------- | --------------------------- |
| `auth/`              | Authentication & onboarding |
| `profile/`           | User profiles               |
| `artists/`           | Artist discovery & profiles |
| `service-providers/` | Service marketplace         |
| `projects/`          | Project requests & work     |
| `delivery/`          | Work delivery               |
| `payments/`          | Stripe payments             |
| `posts/`             | Social feed                 |
| `messaging/`         | Chat system                 |
| `notifications/`     | Push notifications          |
| `reviews/`           | Ratings & reviews           |
| `files/`             | File transfers              |
| `social/`            | Follow system               |
| `ai/`                | AI assistant                |

## Adding a New Feature

1. Create folder: `mkdir -p {feature}/{screens,services,components}`
2. Add screens to `screens/`
3. Add services to `services/`
4. Register screens in `App.tsx`







