# MusiStash Mobile

> Complete reference for engineers working on the MusiStash iOS/Android app — setup, architecture, feature map, and App Store submission testing.

MusiStash is a music industry platform connecting:

- **Artists** — musicians growing their careers
- **Service Providers** — producers, engineers, designers offering music services
- **Listeners** — fans and potential investors

The app supports service marketplace transactions, messaging, project management, payments, and social features.

**App version:** 1.0.3 (iOS build 13) · 
**Expo SDK:** 54

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Quick Start](#quick-start)
3. [Full Setup Guide](#full-setup-guide)
4. [Setup Troubleshooting](#setup-troubleshooting)
5. [Repository Layout](#repository-layout)
6. [Architecture](#architecture)
7. [Configuration & Secrets](#configuration--secrets)
8. [Navigation](#navigation)
9. [Authentication](#authentication)
10. [Database & Backend](#database--backend)
11. [Payments](#payments)
12. [Feature Reference](#feature-reference)
13. [Services Layer](#services-layer)
14. [Styling & Theming](#styling--theming)
15. [Common Tasks](#common-tasks)
16. [Building & Deploying](#building--deploying)
17. [Runtime Troubleshooting](#runtime-troubleshooting)
18. [App Store Submission Test Checklist](#app-store-submission-test-checklist)
19. [Conventions](#conventions)
20. [Resources](#resources)

---

## Tech Stack

| Technology            | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| **React Native 0.81** | Cross-platform mobile framework                    |
| **Expo SDK 54**       | Development tooling & native APIs                  |
| **TypeScript 5.9**    | Type-safe JavaScript                               |
| **Supabase**          | PostgreSQL + Auth + Storage + Edge Functions       |
| **Stripe Connect**    | Marketplace payments and provider payouts          |
| **React Navigation 7**| Stack + Bottom Tabs navigation                     |
| **AsyncStorage**      | Local session/data persistence                     |

State management is React Context. There is no Redux.

---

## Quick Start

If your environment is already set up:

```bash
npm install
cd ios && pod install && cd ..
npx expo run:ios
```

Or start the dev server and pick a platform:

```bash
npm start        # then press 'i' for iOS, 'a' for Android
```

---

## Full Setup Guide

### Prerequisites

- **macOS** (Sequoia 15.x recommended) — required for iOS builds
- **Xcode 16.1+** — required by React Native 0.81.x
- **Node.js 22.x** (`node -v`)
- **CocoaPods 1.15+** (`sudo gem install cocoapods`)
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- An **Expo account** (expo.dev)
- An **Apple Developer account** (for device builds)

### Step 1 — Clone and install

```bash
git clone https://github.com/akshathap06/RestructuredMusiStash.git
cd RestructuredMusiStash
npm install
```

### Step 2 — Install iOS pods

```bash
cd ios
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
pod install
cd ..
```

### Step 3 — Run on the simulator

```bash
npx expo run:ios
```

This builds the native iOS app, installs it on the simulator, starts Metro, and launches the app.

### Testing on a physical device

```bash
npx expo start --tunnel --dev-client --clear
```

Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).

### EAS builds (TestFlight / distribution)

```bash
eas login
eas build --profile development --platform ios --clear-cache
```

You will need an Apple **App-Specific Password**:

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Open "App-Specific Passwords"
4. Generate a new password and use it when EAS prompts for Apple credentials

### Key config files

`eas.json` — build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release",
        "cocoapods": "1.16.2",
        "image": "latest"
      }
    }
  }
}
```

`ios/Podfile` — these must be at the top:

```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
ENV['FOLLY_CFG_NO_COROUTINES'] = '1'
```

---

## Setup Troubleshooting

### `react-native-reanimated` compilation error

```
error: non-virtual member function marked 'override' hides virtual member function
```

Incompatibility between reanimated 3.x and Xcode 16.3+. Upgrade to reanimated 4.x with worklets:

```bash
npm install react-native-reanimated@4.2.0
npm install react-native-worklets@0.7.0
cd ios && pod install && cd ..
```

### `[Reanimated] react-native-worklets package isn't installed`

```bash
npm install react-native-worklets@0.7.0
cd ios && pod install && cd ..
```

### `folly/coro/Coroutine.h file not found`

Add to the top of `ios/Podfile`, then reinstall pods:

```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
ENV['FOLLY_CFG_NO_COROUTINES'] = '1'
```

### `React Native requires Xcode >= 16.1`

Update Xcode from the Mac App Store. For EAS builds, pin the image in `eas.json`:

```json
{ "build": { "development": { "ios": { "image": "macos-sequoia-15.2-xcode-16.2" } } } }
```

### Pod install encoding error (`invalid byte sequence in UTF-8`)

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd ios && pod install && cd ..
```

### Port 8081 already in use

```bash
lsof -i :8081
kill -9 <PID>
# or use another port
npx expo start --port 8082
```

### Simulator not found

```bash
xcrun simctl list devices
npx expo run:ios --device "iPhone 16 Pro"
```

### "Unable to find a development build"

```bash
npx expo run:ios
# or via EAS
eas build --profile development --platform ios
eas build:run --platform ios --latest
```

### EAS build expired

```bash
eas build --profile development --platform ios --clear-cache
```

### `Input is required, but stdin is not readable`

EAS needs interactive Apple credentials. Run the command directly in your terminal rather than through an IDE agent, or build locally with `npx expo run:ios`.

### Clean rebuilds

```bash
# Reset Metro cache
npx expo start --clear

# Reset iOS build
cd ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData
pod install && cd ..

# Full clean rebuild
rm -rf node_modules ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData
npm install
cd ios && pod install && cd ..
npx expo run:ios
```

### Command reference

| Command                                          | Description                       |
| ------------------------------------------------ | --------------------------------- |
| `npx expo run:ios`                               | Build and run on iOS simulator    |
| `npx expo start --tunnel --dev-client`           | Dev server with tunnel            |
| `npx expo start --clear`                         | Start with cleared cache          |
| `eas build --profile development --platform ios` | Create an EAS build               |
| `eas build:run --platform ios --latest`          | Install latest EAS build          |
| `cd ios && pod install`                          | Install/update iOS pods           |
| `xcrun simctl list devices`                      | List available simulators         |
| `npx expo-doctor`                                | Check project health              |
| `eas build:list`                                 | View EAS build history            |

---

## Repository Layout

```
RestructuredMusiStash/
├── App.tsx                 # Root component + all navigation
├── index.ts                # Entry point (registerRootComponent)
├── app.json                # Expo config (version, permissions, deep links)
├── eas.json                # EAS Build profiles
├── metro.config.js         # Metro bundler config
├── assets/                 # App icons, splash screens, logos
├── android/                # Native Android project
├── ios/                    # Native iOS project (Podfile, Info.plist)
├── scripts/
│   ├── javascript/         # One-off DB/migration scripts
│   ├── shell/              # Dev shell scripts
│   └── MIGRATION.md        # Docs for the migration scripts
├── public/                 # Standalone web pages (see below)
├── src/                    # Application code (see Architecture)
└── supabase/
    ├── functions/          # Edge Functions (serverless)
    └── migrations/         # SQL migrations
```

### The `public/` directory

This repo is a **mobile app** — there is no web application in it. `public/` holds the only browser-facing artifacts: two standalone static pages used as Stripe Connect onboarding landing pages.

| File                         | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `public/stripe-return.html`  | Deep-links back into the app after Stripe onboarding completes |
| `public/stripe-refresh.html` | Deep-links back into the app when a Stripe link expires        |

Both redirect to `musistash://…` and fall back to the App Store after 2 seconds. They are **not** built or bundled by this repo — they are meant to be deployed to `musistash.com`, which is where the Edge Functions point their Stripe redirect URLs (`APP_URL`, defaulting to `https://musistash.com`, in `supabase/functions/create-connect-account/` and `get-onboarding-url/`).

Two caveats worth knowing:

- `supabase/functions/stripe-redirect/index.ts` serves equivalent HTML dynamically, so these static files may be redundant with it.
- The Edge Functions use `return_url: ${APP_URL}/stripe-success`, but the file here is named `stripe-return.html`. Verify what `musistash.com` actually serves at `/stripe-success` and `/stripe-refresh` before relying on these files.

> **Note on Expo web:** `react-native-web`, `react-dom`, the `npm run web` script, and `app.json`'s `web.favicon` are the Expo *web target* of the mobile app, not a separate web app. They must stay at the repo root — moving them would break the build. Keep this directory named `public/`: that is the folder Expo copies into the web build root on `expo export --platform web`. (`web/` is a different Expo convention — it holds the customizable `web/index.html` template — so renaming this folder would silently stop these pages from being served.)

---

## Architecture

The app uses a **feature-based architecture** under `src/features/`. Each feature is self-contained:

```
features/[feature-name]/
├── screens/                 # Screen components
├── services/                # API & business logic
├── components/              # Feature-specific components
└── [FeatureContext.tsx]     # Optional context provider
```

### Feature modules

| Feature               | Path                          | Description                             |
| --------------------- | ----------------------------- | --------------------------------------- |
| **auth**              | `features/auth/`              | Login, registration, onboarding, reset  |
| **profile**           | `features/profile/`           | User profile, user search               |
| **artists**           | `features/artists/`           | Artist profiles, browse artists         |
| **service-providers** | `features/service-providers/` | Provider profiles & dashboard           |
| **posts**             | `features/posts/`             | Social feed, create posts               |
| **messaging**         | `features/messaging/`         | Chat, conversations                     |
| **payments**          | `features/payments/`          | Stripe payments, earnings, orders       |
| **projects**          | `features/projects/`          | Project requests, work submissions      |
| **delivery**          | `features/delivery/`          | File delivery for completed projects    |
| **investments**       | `features/investments/`       | Investment interest tracking            |
| **notifications**     | `features/notifications/`     | In-app notifications                    |
| **settings**          | `features/settings/`          | App settings, account management        |
| **files**             | `features/files/`             | File uploads & transfers                |
| **reviews**           | `features/reviews/`           | Service provider reviews                |
| **social**            | `features/social/`            | Follow/unfollow system                  |
| **ai**                | `features/ai/`                | AI agentic manager                      |

### The legacy directories — read this before you edit

`src/screens/`, `src/services/`, and `src/contexts/` predate the feature reorganization. **They are not dead code.** As of this writing:

- `App.tsx` imports **exclusively** from `src/features/` (73 imports, zero from the legacy paths).
- But feature code still imports **~144 times** from `src/services/` and `src/contexts/` — e.g. `src/features/messaging/screens/ChatScreen.tsx` imports `useAuth` from `../../../contexts/AuthContext`, and `src/features/payments/screens/MyOrdersScreen.tsx` imports `WorkSubmissionService` from `../../../services/`.
- Some legacy files are thin re-export shims (`src/services/authService.ts` just re-exports `../features/auth/services/authService`), but many are the real implementation.

Practical consequences:

- Duplicate filenames exist in both trees (`AuthContext.tsx`, `authService.ts`, `postsService.ts`, `ProfileScreen.tsx`, …). **Check which one is actually imported before editing** — editing the wrong copy is the single easiest way to waste an hour here.
- Put new code in `src/features/`.
- Don't bulk-delete the legacy directories; migrate imports first.

### Remaining `src/` directories

| Path              | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `src/components/` | Shared UI components                           |
| `src/config/`     | App configuration (Stripe keys)                |
| `src/lib/`        | Supabase client                                |
| `src/shared/`     | Shared utilities, global error handler         |
| `src/styles/`     | Theme & global styles                          |
| `src/utils/`      | Utility helpers                                |

---

## Configuration & Secrets

**This project does not use a `.env` file.** Configuration is hardcoded in source:

| What                | Where                                             |
| ------------------- | ------------------------------------------------- |
| Supabase URL & key  | `src/lib/supabase.ts`                             |
| Stripe keys         | `src/config/stripeConfig.ts`                      |
| Server-side secrets | Supabase Edge Function environment variables      |

Notes:

- `src/lib/supabase.ts` routes through the custom domain `https://api.musistash.com` (`USE_CUSTOM_DOMAIN = true`), falling back to the raw Supabase URL when disabled.
- A few payment services read `process.env.EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as *optional overrides*, with hardcoded fallbacks. Setting them is not required.
- `src/config/stripeConfig.ts` contains a **live** (`pk_live_…`) publishable key. Publishable keys are safe to ship, but be aware you are pointed at production Stripe — use Stripe test cards deliberately.
- Secret keys (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`) belong only in Supabase Edge Function env vars, never in the app bundle.
- `.env` and `.env.*` are gitignored. If you introduce one, keep it that way.

---

## Navigation

All navigation lives in `App.tsx`. There are two top-level stacks.

### Auth stack (unauthenticated)

```
Welcome → Intro → Login/Register → Onboarding → RoleSelection → [Artist/Service Onboarding]
```

| Screen                            | File                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `WelcomeCarouselScreen`           | `features/auth/screens/WelcomeCarouselScreen.tsx`             |
| `IntroScreenNew`                  | `features/auth/screens/IntroScreenNew.tsx`                    |
| `LoginScreen`                     | `features/auth/screens/LoginScreen.tsx`                       |
| `RegisterScreen`                  | `features/auth/screens/RegisterScreen.tsx`                    |
| `EmailVerificationScreen`         | `features/auth/screens/EmailVerificationScreen.tsx`           |
| `CompleteRegistrationScreen`      | `features/auth/screens/CompleteRegistrationScreen.tsx`        |
| `ResetPasswordScreen`             | `features/auth/screens/ResetPasswordScreen.tsx`               |
| `OnboardingScreen`                | `features/auth/screens/OnboardingScreen.tsx`                  |
| `RoleSelectionScreen`             | `features/auth/screens/RoleSelectionScreen.tsx`               |
| `ArtistOnboardingScreen`          | `features/auth/screens/ArtistOnboardingScreen.tsx`            |
| `ServiceProviderOnboardingScreen` | `features/auth/screens/ServiceProviderOnboardingScreen.tsx`   |
| `TermsOfServiceScreen`            | `features/auth/screens/TermsOfServiceScreen.tsx`              |
| `PrivacyPolicyScreen`             | `features/auth/screens/PrivacyPolicyScreen.tsx`               |

### Main stack (authenticated)

```
MainTabs (Bottom Navigation)
├── Profile Tab     → ProfileScreen
├── Investment Tab  → BrowseArtistsScreen
├── Create Tab      → CreateHubScreen
└── Posts Tab       → PostsScreen
```

| Screen                            | File                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `ProfileScreen`                   | `features/profile/screens/ProfileScreen.tsx`                                  |
| `BrowseArtistsScreen`             | `features/artists/screens/BrowseArtistsScreen.tsx`                            |
| `CreateHubScreen`                 | `features/posts/screens/CreateHubScreen.tsx`                                  |
| `PostsScreen`                     | `features/posts/screens/PostsScreen.tsx`                                      |
| `MessagesScreen`                  | `features/messaging/screens/MessagesScreen.tsx`                               |
| `ChatScreen`                      | `features/messaging/screens/ChatScreen.tsx`                                   |
| `ServiceProviderDashboardScreen`  | `features/service-providers/screens/ServiceProviderDashboardScreen.tsx`       |

### Adding a screen

1. Create it in the appropriate feature:

```tsx
// src/features/[feature]/screens/NewScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function NewScreen({ navigation }: { navigation: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Text style={{ color: '#FFF' }}>New Screen</Text>
    </View>
  );
}
```

2. Register it in `App.tsx`:

```tsx
import NewScreen from './src/features/[feature]/screens/NewScreen';

<Stack.Screen name="NewScreen" component={NewScreen} options={{ headerShown: false }} />
```

3. Navigate to it:

```tsx
navigation.navigate('NewScreen', { param: value });
```

---

## Authentication

### AuthContext

Two copies exist — `src/features/auth/AuthContext.tsx` and `src/contexts/AuthContext.tsx`. Most screens currently import the latter via `../../../contexts/AuthContext`. Confirm which one your screen uses.

```tsx
const {
  user,              // Current user object
  isAuthenticated,   // Boolean login state
  isLoading,         // Auth loading state
  needsOnboarding,   // New user flag
  login,
  register,
  logout,
  signOut,           // Alias for logout
} = useAuth();
```

### User object

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;      // 'listener' | 'artist' | 'service_provider'
  avatar?: string;
}
```

### Flow

1. **Login** — `authService.login(email, password)` → Supabase Auth
2. **Register** — `authService.register(name, email, phone, password)` → creates auth user + `users` record
3. **OAuth** — Google / Apple sign-in via Supabase
4. **Email OTP** — 4-digit verification code before completing registration
5. **Session** — persisted in AsyncStorage by the Supabase client

### Key files

| File                                                    | Purpose               |
| ------------------------------------------------------- | --------------------- |
| `features/auth/AuthContext.tsx`                         | Auth state provider   |
| `features/auth/services/authService.ts`                 | Auth API calls        |
| `features/auth/services/emailVerificationService.ts`    | Send/verify OTP       |
| `features/auth/services/twilioVerificationService.ts`   | Email OTP delivery    |

Google OAuth: the Web Client ID lives in `authService.ts`; redirect URIs are configured in Google Cloud Console and must match Supabase Auth settings.

---

## Database & Backend

### Querying Supabase

```typescript
import { supabase } from '../../../lib/supabase';

// Select
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Insert
const { data, error } = await supabase
  .from('artist_profiles')
  .insert({ user_id, artist_name, bio })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('users')
  .update({ name: newName })
  .eq('id', userId);
```

### Core tables

| Table                   | Purpose                        |
| ----------------------- | ------------------------------ |
| `users`                 | Core user accounts             |
| `artist_profiles`       | Artist-specific data           |
| `service_providers`     | Service provider profiles      |
| `posts`                 | All post types                 |
| `post_likes`            | Post likes                     |
| `comments`              | Post comments                  |
| `follows`               | Follow relationships           |
| `conversations`         | Chat threads                   |
| `messages`              | Individual chat messages       |
| `service_listings`      | Services offered by providers  |
| `project_requests`      | Client requests for services   |
| `project_agreements`    | Negotiated terms               |
| `project_payments`      | Payment records                |
| `work_submissions`      | Delivered work files           |
| `project_notifications` | In-app notifications           |
| `investment_interests`  | Artist investment interest     |
| `reviews`               | Service reviews                |

Selected schemas:

```sql
-- artist_profiles
id, user_id, artist_name, bio, profile_photo, banner_photo,
genre[], monthly_listeners, total_streams, spotify_followers,
is_verified, status, created_at

-- service_providers
id, user_id, business_name, provider_type, tagline, bio, about_section,
contact_email, phone, website_url, location, years_of_experience,
specializations[], genres[], skills[], base_price, price_per_hour,
min_project_budget, max_project_budget, turnaround_time_days,
profile_photo, social_links, status, stripe_account_id,
stripe_onboarding_complete, can_accept_payments, created_at

-- posts
id, user_id, content, media_urls[], post_type, title, description,
price, price_type, hashtags[], like_count, comment_count, created_at

-- project_requests
id, client_id, service_provider_id, service_type, project_description,
budget_range, timeline, status, created_at

-- investment_interests
id, user_id, artist_id, artist_name, created_at
UNIQUE(user_id, artist_id)
```

### Storage buckets

`profile-pictures`, `post-media`, `work-submissions`, `artist-photos`

### Edge Functions (`supabase/functions/`)

| Function                 | Purpose                          |
| ------------------------ | -------------------------------- |
| `create-connect-account` | Create Stripe Connect account    |
| `get-onboarding-url`     | Generate Stripe onboarding link  |
| `check-connect-status`   | Check provider onboarding state  |
| `create-payment-intent`  | Process payments                 |
| `create-stripe-transfer` | Payouts to providers             |
| `stripe-connect-webhook` | Handle Stripe webhooks           |
| `stripe-redirect`        | Serve deep-link redirect pages   |
| `send-verification-email`| Send OTP emails                  |
| `get-secure-file-url`    | Signed URLs for delivered files  |

Deploy with `supabase functions deploy <function-name>`.

---

## Payments

The app uses **Stripe Connect** for marketplace payments: clients pay for services, the platform takes a fee (4%), and providers receive payouts.

### Booking → payout flow

1. Client browses a provider's offerings
2. Client sends a project request
3. Provider responds with a quote (price + timeline)
4. Client accepts or counter-offers
5. Client pays — funds are held
6. Provider delivers work
7. Client approves the delivery
8. Funds are released to the provider

### Provider onboarding flow

1. User creates a service provider profile
2. System creates a Stripe Connect account via `create-connect-account`
3. User is redirected to Stripe's hosted onboarding
4. Webhook sets `stripe_onboarding_complete` when finished
5. Provider can now accept payments

### Key files

| File                                                        | Purpose                    |
| ----------------------------------------------------------- | -------------------------- |
| `features/payments/StripeContext.tsx`                       | Stripe provider wrapper    |
| `features/payments/services/stripeConnectService.ts`        | Connect account management |
| `features/payments/services/stripePaymentService.ts`        | Payment processing         |
| `features/payments/screens/PaymentScreen.tsx`               | Payment UI                 |
| `features/payments/screens/MyOrdersScreen.tsx`              | Client's orders            |
| `features/payments/screens/ProviderEarningsScreen.tsx`      | Provider earnings          |
| `src/config/stripeConfig.ts`                                | Stripe keys & Apple/Google Pay |

### Delete restrictions

- **Client cannot delete** a request if payment was made OR a submission exists
- **Provider cannot delete** a request if payment was made

---

## Feature Reference

Quick map of user-facing features to their code. Paths are relative to `src/`.

### User profiles

Basic info, profile picture upload, stats (posts/followers/following), user posts grid.

| Concern         | File                                            |
| --------------- | ----------------------------------------------- |
| Profile screen  | `features/profile/screens/ProfileScreen.tsx`    |
| Profile data    | `features/profile/services/productionProfileService.ts` |
| Profile picture | `services/profilePictureService.ts`             |

### Artist profiles

Artist name, bio, genre tags, profile/banner photos, monthly listeners, total streams, Spotify followers, verification badge.

| Concern        | File                                                     |
| -------------- | -------------------------------------------------------- |
| Create artist  | `features/auth/screens/ArtistOnboardingScreen.tsx`       |
| View artist    | `features/artists/screens/ArtistProfileViewScreen.tsx`   |
| Browse artists | `features/artists/screens/BrowseArtistsScreen.tsx`       |
| Artists data   | `features/artists/services/approvedArtistsService.ts`    |
| Artist CRUD    | `features/artists/services/artistAccountService.ts`      |

New artist profiles are created with status `pending` and await approval.

### Service providers

Business name, provider type, tagline, bio, contact info, experience, specializations, genres, skills, pricing, Stripe Connect, service listings, portfolio.

| Concern           | File                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| Create provider   | `features/auth/screens/ServiceProviderOnboardingScreen.tsx`             |
| Dashboard         | `features/service-providers/screens/ServiceProviderDashboardScreen.tsx` |
| Provider data     | `features/service-providers/services/serviceProviderService.ts`         |
| Stripe Connect    | `features/payments/services/stripeConnectService.ts`                    |

### Posts & feed

Text posts with optional media (image/video/audio), service offers, portfolio posts, likes, comments, shares, hashtags.

Post types: `post` / `text` / `general` / `user_post` (regular), `service_offer` (has price), `video_portfolio`, `future_release` (artist teasers), `producer_sample`.

| Concern       | File                                            |
| ------------- | ----------------------------------------------- |
| Feed          | `features/posts/screens/PostsScreen.tsx`        |
| Create post   | `features/posts/screens/CreatePostScreen.tsx`   |
| Create hub    | `features/posts/screens/CreateHubScreen.tsx`    |
| Posts CRUD    | `features/posts/services/postsService.ts`       |
| Media upload  | `features/files/services/mediaUploadService.ts` |
| Comment modal | `src/components/CommentModal.tsx`               |

### Social

| Concern         | File                                       | Function                     |
| --------------- | ------------------------------------------ | ---------------------------- |
| Follow/unfollow | `features/social/services/followService.ts`| `followUser`, `unfollowUser` |
| Check following | `features/social/services/followService.ts`| `isFollowing`                |
| Followers list  | `features/social/services/followService.ts`| `getFollowers`, `getFollowing` |
| Like / unlike   | `features/posts/services/postsService.ts`  | `likePost`, `unlikePost`, `hasUserLikedPost` |
| Comments        | `features/posts/services/postsService.ts`  | `addComment`, `getComments`  |

### Messaging

Direct messages, real-time updates, read receipts, conversation list.

| Concern       | File                                                |
| ------------- | --------------------------------------------------- |
| Messages list | `features/messaging/screens/MessagesScreen.tsx`     |
| Chat          | `features/messaging/screens/ChatScreen.tsx`         |
| Messaging API | `features/messaging/services/messagingService.ts`   |

> Messaging shows **artist names only** — do not expose users' real names in chat.

### Projects & delivery

| Concern           | File                                                            |
| ----------------- | --------------------------------------------------------------- |
| Request details   | `features/projects/screens/ProjectRequestDetailsScreen.tsx`     |
| Request CRUD      | `features/projects/services/projectRequestService.ts`           |
| Work submission   | `features/projects/services/WorkSubmissionService.ts`           |
| Client work view  | `features/projects/screens/ClientWorkViewScreen.tsx`            |

### Investments

Browse artists to potentially invest in, register interest ("Join the Investment Movement"), track interest counts. Interest is unique per `(user_id, artist_id)` — a user cannot register twice.

### AI agentic manager

`features/ai/` — Audio Analysis, Venue Finder, Email Assistant, Financial Tracker, Fan Analytics, Campaign Manager.

### Common edit scenarios

| I want to…             | Edit                                                        |
| ---------------------- | ----------------------------------------------------------- |
| Change login UI        | `features/auth/screens/IntroScreenNew.tsx`                  |
| Modify profile layout  | `features/profile/screens/ProfileScreen.tsx`                |
| Add a new post type    | `features/posts/screens/CreatePostScreen.tsx` + `postsService.ts` |
| Change payment flow    | `features/payments/screens/PaymentScreen.tsx`               |
| Update navigation      | `App.tsx`                                                   |
| Add a database query   | `features/*/services/*.ts`                                  |
| Modify Supabase config | `src/lib/supabase.ts`                                       |
| Change an Edge Function| `supabase/functions/*/index.ts`                             |

---

## Services Layer

Services hold business logic and API calls. Prefer `features/[feature]/services/`; the flat `src/services/` directory is legacy but still widely imported (see [Architecture](#architecture)).

| Service                       | Purpose                     |
| ----------------------------- | --------------------------- |
| `authService.ts`              | Authentication              |
| `emailVerificationService.ts` | OTP codes                   |
| `productionProfileService.ts` | Profile data with caching   |
| `approvedArtistsService.ts`   | Artist discovery            |
| `artistAccountService.ts`     | Artist CRUD                 |
| `serviceProviderService.ts`   | Provider CRUD               |
| `postsService.ts`             | Posts CRUD                  |
| `followService.ts`            | Follow system               |
| `messagingService.ts`         | Direct messages             |
| `projectRequestService.ts`    | Service requests            |
| `WorkSubmissionService.ts`    | File delivery               |
| `stripePaymentService.ts`     | Payments                    |
| `stripeConnectService.ts`     | Provider payouts            |
| `notificationService.ts`      | Notifications               |
| `reviewService.ts`            | Reviews                     |
| `moderationService.ts`        | Blocking & content reports  |
| `mediaUploadService.ts`       | File uploads                |

### Service pattern

```typescript
// features/example/services/exampleService.ts
import { supabase } from '../../../lib/supabase';

export class ExampleService {
  static async getData(id: string) {
    const { data, error } = await supabase
      .from('examples')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

## Styling & Theming

The app is dark-theme only, via `MusiStashTheme` in `src/styles/theme.ts`:

```typescript
import { MusiStashTheme } from '../../../styles/theme';

<View style={{ backgroundColor: MusiStashTheme.colors.background }}>
  <Text style={{ color: MusiStashTheme.colors.white }}>Hello</Text>
</View>
```

### Colors

| Role      | Value                              |
| --------- | ---------------------------------- |
| Background| `#000000`                          |
| Text      | `#FFFFFF`                          |
| Accent    | `#3B82F6`                          |
| Success   | `#10B981`                          |
| Error     | `#EF4444`                          |
| Grays     | `#6B7280`, `#9CA3AF`, `#374151`    |

### Conventions

1. Inline styles for simple cases; `StyleSheet.create()` for reusable styles
2. Black (`#000000`) background on every screen
3. White/light text for readability
4. Border radius: 12–16px for cards, 8–12px for buttons
5. Spacing in multiples of 4 (4, 8, 12, 16, 24, 32)

```tsx
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
```

---

## Common Tasks

### Add a new feature

```
src/features/my-feature/
├── screens/MyFeatureScreen.tsx
├── services/myFeatureService.ts
└── components/MyFeatureCard.tsx
```

Then create the screen, add the service, register the screen in `App.tsx`, and link to it from existing screens.

### Add a database table

1. Create a migration in `supabase/migrations/`
2. Run it in the Supabase Dashboard
3. Add TypeScript types
4. Add service methods
5. Use it in screens

### Add an API endpoint

1. Create an Edge Function in `supabase/functions/`
2. Deploy: `supabase functions deploy <function-name>`
3. Call it from the app via `supabase.functions.invoke` or `fetch`

### Modify user profile fields

1. Update the `users` table in Supabase
2. Update the `User` interface in `src/lib/supabase.ts`
3. Update `AuthContext` if needed
4. Update `ProfileScreen` and `ProfileSettingsScreen`

---

## Building & Deploying

### Development

```bash
npm start           # then press 'i' (iOS) or 'a' (Android)
npx expo run:ios
npx expo run:android
```

### Production (App Store)

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### EAS build profiles

| Profile       | Purpose                        |
| ------------- | ------------------------------ |
| `development` | Development client builds      |
| `preview`     | Internal testing (TestFlight)  |
| `production`  | App Store release              |

### Version management

**Bump versions before every App Store submission.**

1. `app.json`:

```json
{
  "expo": {
    "version": "1.0.3",
    "ios": { "buildNumber": "13" }
  }
}
```

2. Native `ios/MusiStash/Info.plist`:

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.3</string>
<key>CFBundleVersion</key>
<string>13</string>
```

Keep `app.json` and `Info.plist` in sync. `buildNumber` must increment on every submission, even for the same marketing version.

---

## Runtime Troubleshooting

| Issue                      | Solution                                             |
| -------------------------- | ---------------------------------------------------- |
| "Module not found"         | `npm install`, restart Metro                         |
| iOS build fails            | `cd ios && pod install && cd ..`                     |
| Supabase connection fails  | Check network, verify URL/keys in `src/lib/supabase.ts` |
| Navigation not working     | Check the screen is registered in `App.tsx`          |
| Styles not applying        | Check StyleSheet syntax and component hierarchy      |
| Auth not persisting        | Check AsyncStorage and Supabase session config       |
| Edited a file, nothing changed | You probably edited the legacy copy — see [Architecture](#architecture) |

### Debug logging

The app logs extensively. Watch the Metro terminal:

```
🔔 Auth state changed: SIGNED_IN
✅ User authenticated: user@email.com
📦 Profile data loaded
```

---

## App Store Submission Test Checklist

Run this end to end before every App Store submission.

### Notes for testers

1. **Test accounts** — create one of each user type (regular user, artist, service provider)
2. **Payments** — use Stripe test cards; note the app ships a **live** publishable key
3. **Email** — verify emails actually arrive for verification and password reset
4. **Deep links** — test password reset links from real emails
5. **Media** — test various file sizes and formats
6. **Edge cases** — very long text, special characters, emojis

### 1. Authentication & onboarding

**Intro screen**

- [ ] App launches to Intro with rotating animated words ("Creation", "Connection", "Investment", "Freedom", "Growth", "Opportunities")
- [ ] "Get Started" → Registration
- [ ] "Sign In" → Login
- [ ] "Continue with Google" → Google OAuth flow
- [ ] Google sign-in completes and navigates to main app
- [ ] Loading spinner shows during authentication

**Registration**

- [ ] Email field accepts input
- [ ] Invalid email shows a validation error
- [ ] "Continue" sends a verification code to the email
- [ ] Loading state shows while sending
- [ ] Terms of Service link opens the Terms screen
- [ ] Privacy Policy link opens the Privacy screen
- [ ] "Already have an account?" navigates to Login

**Email verification**

- [ ] 4-digit OTP input fields display correctly
- [ ] Correct code auto-verifies
- [ ] Invalid code shows an error alert
- [ ] "Resend Code" works with a 60-second countdown preventing rapid resends
- [ ] Back button returns to Registration
- [ ] Verification navigates to Complete Registration

**Complete registration**

- [ ] Email is pre-filled and read-only
- [ ] Full name, phone, password, confirm password fields work
- [ ] Password show/hide toggles work
- [ ] Password validation: min 8 chars, one uppercase, one lowercase, one number
- [ ] Password mismatch shows an error
- [ ] "Create Account" creates the account and navigates to the main app
- [ ] Back button returns to the previous screen

**Login**

- [ ] MusiStash logo displays
- [ ] Email and password fields work; show/hide toggle works
- [ ] "Sign In" authenticates
- [ ] Invalid credentials show an error alert
- [ ] "Forgot Password?" shows a confirmation dialog
- [ ] "Don't have an account?" navigates to Registration
- [ ] Loading state shows during authentication
- [ ] Successful login navigates to the main app

**Password reset**

- [ ] "Forgot Password?" → confirmation dialog
- [ ] "Send" sends the reset email
- [ ] Navigates to "Check Your Email"
- [ ] Reset email contains a valid link
- [ ] Deep link opens the app at Reset Password
- [ ] New password + confirm password fields validate
- [ ] "Reset Password" updates the password and navigates to Login

**Legal screens**

- [ ] Terms of Service content scrolls; back button works
- [ ] Privacy Policy content scrolls; back button works

### 2. Main navigation

**Bottom tabs**

- [ ] 4 tabs display: Profile, Investment, Create, Posts
- [ ] Each tab navigates to the correct screen
- [ ] Active tab is highlighted
- [ ] Tab icons switch between filled/outline by active state

**Sidebar (hamburger) menu**

- [ ] Hamburger icon (☰) slides the sidebar in from the left
- [ ] User avatar, name, and email display in the header
- [ ] Close button (X) and backdrop tap both close the sidebar
- [ ] "Agentic Manager", "Profile", "Create Post", "My Requests", "My Orders" all navigate correctly
- [ ] "Become an Artist" → Create Artist
- [ ] "Become Service Provider" → Create Service Provider
- [ ] "Browse Artists" → Browse Artists
- [ ] "Notifications" navigates and shows an unread badge
- [ ] "Settings" → Profile/Settings
- [ ] "Log Out" logs out and returns to Intro

**Universal header**

- [ ] "MusiStash" title displays centered
- [ ] Hamburger icon on the left
- [ ] Header appears on all main tabs

### 3. Profile screen

- [ ] Profile picture displays (or placeholder icon)
- [ ] Name, email, followers, following, and posts counts display
- [ ] Pull-to-refresh works
- [ ] Profile type switcher visible when the user has multiple types (User / Artist if approved / Service Provider if created)
- [ ] Switching types changes the displayed profile data
- [ ] **User actions** — Notifications (with badge) and Orders navigate correctly
- [ ] **Artist actions** — Notifications (with badge) and Activity navigate correctly
- [ ] **Provider actions** — Manage Services, View Portfolio, and Stripe Setup/Earnings navigate correctly
- [ ] Unverified provider sees the Stripe onboarding prompt; verified provider goes to Earnings
- [ ] Notifications preview shows recent items; "See all" opens the full screen
- [ ] Recent activity section displays and expands
- [ ] User posts grid displays; tapping a post opens Post Detail
- [ ] Empty state shows when there are no posts
- [ ] Tapping the profile picture opens the image picker, and the selected image uploads

### 4. Investment tab (browse artists)

- [ ] Search bar filters artists by name/bio, debounced in real time
- [ ] Clear (X) button clears the search
- [ ] Artists display in a 2-column grid
- [ ] Each card shows photo (or colored initials), name, up to 2 genre tags, and a verified badge when applicable
- [ ] Initial load shows the first 20 artists
- [ ] Scrolling to the bottom loads more, with a loading indicator
- [ ] "No more artists" shows when everything is loaded
- [ ] Pull-to-refresh reloads the list
- [ ] Tapping a card opens the Artist Profile View; back returns to browse

### 5. Artist profile view

- [ ] Banner image (or gradient placeholder), large profile photo, artist name, verified badge, location, and genre tags display
- [ ] Stats display: monthly listeners, total streams, followers, following, posts
- [ ] Bio displays; "Read more" expands long bios
- [ ] Social links open correctly: Spotify, Instagram, Twitter, YouTube, website
- [ ] "I'm Interested in Investing" shows a confirmation and a success message
- [ ] Button changes to "Interest Registered"; interest cannot be registered twice
- [ ] Follow/Following button toggles correctly
- [ ] Artist posts grid displays; tapping opens Post Detail
- [ ] "Message" opens a new message/chat

### 6. Create hub

- [ ] "Create a Post", "Create Service Listing", "Create Artist Profile", and "Create Service Provider" cards display as appropriate
- [ ] "Create a Post" navigates to Create Post; back returns to the hub
- [ ] "Create Service Listing" prompts to create a provider profile first if none exists
- [ ] With a provider profile, it opens Create Post in service listing mode
- [ ] "Create Artist Profile" / "Create Service Provider" navigate correctly, or show the existing profile with an edit option

### 7. Create post

- [ ] Regular post mode is the default; service listing and portfolio modes work when navigated with a param
- [ ] Content text input and character count/limit display
- [ ] "Add Media" opens picker options
- [ ] Image, video, and audio selection all work
- [ ] Selected media previews display with a remove (X) button on each
- [ ] Multiple media items are supported
- [ ] Audio shows file name, duration when available, and an audio icon
- [ ] Video shows a thumbnail, duration indicator, and play overlay
- [ ] Images show thumbnails, multiple in a grid
- [ ] Hashtag input adds chips with individual remove buttons
- [ ] Optional music metadata (title, artist, album) fields work
- [ ] **Service listing mode** — title, description, pricing type (flat / hourly / range / custom), price inputs, delivery days
- [ ] "Post" is enabled only when content is valid
- [ ] Loading state and upload progress display
- [ ] Success navigates back; errors show an alert
- [ ] **Edit mode** — existing data pre-fills, button reads "Update", and updating navigates back

### 8. Posts / feed

- [ ] "Posts" and "Services" tabs switch correctly
- [ ] Each post shows avatar, name, timestamp, content, media, like count, comment count, and share button
- [ ] Heart icon likes/unlikes and the count updates immediately
- [ ] Comment icon opens the comment modal
- [ ] Share icon opens the share sheet
- [ ] Multiple images render as a swipeable carousel; tapping opens fullscreen
- [ ] Video: play/pause controls, autoplay when visible, pause when scrolled away, fullscreen button
- [ ] Audio: animated visualizer, play/pause, progress bar, drag-to-seek, current time / duration
- [ ] Services feed shows provider name, service title, price, and rating; tapping opens Service Provider Detail
- [ ] Pull-to-refresh works
- [ ] Tapping a post opens Post Detail

### 9. Post detail & comments

- [ ] Full content, media, user info, timestamp, and hashtags display
- [ ] Like button and count work
- [ ] Comment button scrolls to comments or opens the modal
- [ ] Share button opens the share sheet
- [ ] Comments list shows avatar, name, text, and timestamp per comment
- [ ] Add-comment input posts successfully and the new comment appears
- [ ] Back button returns to the previous screen

**Comment modal**

- [ ] Slides up from the bottom with a dimmed background
- [ ] Swipe down or backdrop tap closes it
- [ ] Existing comments display; empty state shows when there are none
- [ ] List scrolls when there are many comments
- [ ] Keyboard avoidance works
- [ ] Posting a comment updates the comment count

### 10. Create artist profile

- [ ] Existing profile shows with an edit option; otherwise the creation form shows
- [ ] Artist/stage name (required), bio, biography, and location fields work
- [ ] Genre selector modal opens with a searchable 100+ genre list
- [ ] Multi-select works; selected genres display as removable chips
- [ ] Profile and banner image pickers work with previews
- [ ] "This is a band" toggle reveals band members, band type selector, and primary artist name
- [ ] Social links: Spotify, Instagram, Twitter, YouTube, website
- [ ] Manual stats: monthly listeners, total streams
- [ ] Optional color scheme: gradient start/middle/end, accent, text
- [ ] Validation errors display for required fields
- [ ] Submission shows a loading state, succeeds, and sets status to "pending"
- [ ] Errors show an alert

### 11. Create service provider

- [ ] Existing profile shows view mode with an "Edit Profile" button; otherwise the multi-step form shows
- [ ] Progress bar and step number ("Step 1 of 6") display
- [ ] **Step 1 Basic** — business name (required), provider type, tagline, bio
- [ ] **Step 2 Contact** — email, phone, website, location, "Accepts Remote Work" and "Available for Hire" toggles
- [ ] **Step 3 Skills** — years of experience, specializations, genres, skills (multi-select modals)
- [ ] **Step 4 Pricing** — base price, price per hour, min/max project budget, turnaround time
- [ ] **Step 5 Portfolio** — profile image, banner image, description, add/remove portfolio media
- [ ] **Step 6 Social** — Instagram, Twitter, YouTube, SoundCloud, Spotify
- [ ] Services list: add/remove services with name, description, price, price type (fixed/hourly/per project), duration
- [ ] Submission shows loading and image upload progress, then succeeds
- [ ] Stripe setup prompt displays after creation
- [ ] "Set Up Payments" opens Stripe Connect onboarding
- [ ] Returning to the app after Stripe setup updates the verification status

### 12. Service provider browsing

- [ ] Provider cards show photo, business name, tagline, specializations, price range, rating/review count, and location
- [ ] Detail screen shows banner, photo, business name, tagline, bio/about, location, and social links
- [ ] "Services", "Info", and "Reviews" tabs work
- [ ] Services tab lists name, description, price, and delivery time with a "Request Service" / "Contact" button
- [ ] "Request Service" opens Contact Service Provider with the service pre-filled
- [ ] Reviews tab shows reviewer, star rating, text, and date
- [ ] "Write Review" is available when eligible; the modal takes a 1–5 star rating and text, and the review appears after submitting
- [ ] Portfolio items display with working audio, video, and image viewers

### 13. Contact service provider

- [ ] Selected service name, description, provider business name, and listed price display
- [ ] "Accept Listed Price" and "Make an Offer" options work; custom price input appears for offers
- [ ] Additional requirements text area, "Urgent Delivery" toggle, and revision rounds input work
- [ ] "Send Request" shows loading, confirms success, and navigates to Project Requests
- [ ] Errors show an alert

### 14. Project requests & details

- [ ] Requests list shows service type, provider/client name, status badge, date, and budget
- [ ] Status colors: pending (yellow/orange), responded (blue), accepted (green), rejected (red), completed (gray/green)
- [ ] Tapping a request opens the details screen
- [ ] Pull-to-refresh works
- [ ] Details show service type, status, other-party info, description, budget, timeline, and requirements
- [ ] Negotiation section: price, timeline, notes, submit quote, and negotiation history
- [ ] **Client** — "responded" offers Accept or Counter; "accepted" reveals Pay
- [ ] **Provider** — "pending" allows responding with a quote; "accepted" reveals Submit Work
- [ ] "Pay Now" opens the Payment screen
- [ ] "Submit Work" opens the Submit Work screen; previous submissions and their status display
- [ ] Work submissions list shows file name, date, and a download button
- [ ] "Message" opens a chat with the other party

### 15. Payment

- [ ] Service amount, platform fee (4%), total, and provider info display
- [ ] "I agree to terms" checkbox must be checked to proceed
- [ ] "Pay $XX.XX" is disabled until terms are accepted
- [ ] Loading state shows during processing
- [ ] Stripe payment sheet opens with card input
- [ ] Successful payment confirms and navigates to the receipt or back to details
- [ ] Failed payment shows an error

### 16. Submit work

- [ ] Project title, client name, service type, and agreed price display
- [ ] "Add Files" opens the file picker
- [ ] Audio, video, image, PDF, and ZIP are all supported
- [ ] Selected files show a type icon, name, and size, with a remove (X) button
- [ ] Description / notes text area works
- [ ] "Submit Work" shows loading and upload progress
- [ ] Success confirms and navigates back to request details
- [ ] Errors show an alert

### 17. My orders

- [ ] Orders list shows service type, provider name, status, date, and price
- [ ] Status badge is color-coded; payment and delivery status indicators display
- [ ] Tapping an order opens Project Request Details
- [ ] Submitted work shows the latest submission with a "View Work" button
- [ ] Pull-to-refresh works

### 18. Notifications

- [ ] Each notification shows a type icon, title, message, time ago, and an unread dot
- [ ] All types render: request accepted, price proposed, agreement created, payment received, work submitted, like, comment, follow
- [ ] Tapping navigates to the relevant screen and marks it read
- [ ] Delete (X) removes a notification
- [ ] "Mark all as read" clears all unread dots
- [ ] Empty state shows "No notifications yet"
- [ ] Pull-to-refresh and back navigation work

### 19. Messaging

**Messages list**

- [ ] Conversations show avatar, name, last message preview, timestamp, and unread badge
- [ ] Green dot indicates online users
- [ ] Search filters conversations by name
- [ ] "New Message" (+) opens the New Message screen
- [ ] Tapping a conversation opens Chat
- [ ] Pull-to-refresh works

**Chat**

- [ ] Header shows back button, other user's name and avatar, and online status
- [ ] Messages display chronologically — own on the right (accent), others on the left (gray)
- [ ] Timestamps and status indicators (sent, delivered, read) display
- [ ] Text input, send button, keyboard avoidance, and placeholder all work
- [ ] Sent messages appear immediately with a loading indicator until delivered
- [ ] Send errors offer a retry
- [ ] New messages arrive automatically (polling/websocket)
- [ ] Auto-scrolls to the newest message; scrolling up loads older ones

**New message**

- [ ] Search finds matching users
- [ ] Tapping a user selects them as recipient
- [ ] Sending creates the conversation and navigates to Chat

### 20. Agentic manager

- [ ] Features grid shows: Audio Analysis, Venue Finder, Email Assistant, Financial Tracker, Fan Analytics, Campaign Manager
- [ ] **Audio Analysis** — "Upload Track" opens the file picker, analysis runs with a loading indicator and timer, and results show BPM, key, energy, danceability, and other features
- [ ] **Venue Finder** — location, venue types, artist genre, and capacity inputs; "Search Venues" returns a list with name, location, and capacity; favoriting works and favorites list displays
- [ ] **Email Assistant** — template selector, recipient name/email, venue name, proposed date, custom message; "Generate Email" produces output with working Copy and Send (opens mail app) buttons
- [ ] **Financial Tracker** — budget items list with add (name, category, amount), revenue estimates, ROI calculations, financial goals, and a health indicator
- [ ] Back/close returns to the main screen

### 21. Manage services & portfolio

**Services**

- [ ] All services display with name, price, and status
- [ ] "Add Service" opens a form modal and saves
- [ ] Tapping a service enters edit mode and saves changes
- [ ] Delete shows a confirmation and removes the service

**Portfolio**

- [ ] Items display with media type indicator, title, and description preview
- [ ] "Add Item" opens the media picker, accepts title/description, and uploads
- [ ] Tapping an item opens a fullscreen/detail view with working audio/video playback and image viewing
- [ ] Delete shows a confirmation and removes the item

### 22. Earnings

- [ ] Total earnings, available balance, pending balance, and this month's earnings display
- [ ] Transaction history shows amount, client name, service type, date, and status
- [ ] "Withdraw" is available when Stripe is connected and pays out to a bank account

### 23. Error states & edge cases

- [ ] No internet → offline message
- [ ] Request timeout → retry option
- [ ] Server error → error alert
- [ ] Empty states: "No posts yet", "No conversations", "No notifications", "No orders yet", "No artists found"
- [ ] Loading indicators on all async operations, with skeleton loaders where appropriate
- [ ] Validation: required fields, email format, password requirements, phone format, price format
- [ ] Permission prompts appear correctly for camera, photo library, microphone, and notifications

### 24. UI/UX standards

- [ ] VoiceOver support
- [ ] Dynamic text size support
- [ ] Sufficient color contrast
- [ ] Touch targets at least 44pt
- [ ] Dark theme applied consistently — black (`#000000`) background, white text, proper contrast
- [ ] Content respects safe area insets; notch/Dynamic Island and home indicator areas stay clear
- [ ] Keyboard avoidance on all input screens; tap outside and "Done" dismiss the keyboard; focused inputs scroll into view
- [ ] Back buttons and swipe-to-go-back work
- [ ] Tab switching maintains state
- [ ] Deep links work correctly

### 25. Performance

- [ ] App opens within 3 seconds
- [ ] Splash screen displays during load with no white flash
- [ ] Smooth 60fps scrolling with no jank on long lists
- [ ] Images lazy load
- [ ] Video plays without buffering; audio plays without delay
- [ ] No crashes on long sessions, reasonable memory usage, no leaks on navigation

### 26. Final checks

- [ ] Tested on iPhone across various sizes
- [ ] Tested on iPad (if applicable)
- [ ] Tested in airplane mode
- [ ] Tested on a slow network
- [ ] All forms validated
- [ ] All navigation paths work
- [ ] No crashes encountered
- [ ] No console errors in the production build
- [ ] App icon and app name display correctly
- [ ] Version number is correct and `buildNumber` was incremented

---

## Conventions

**Do**

- Keep new code in `src/features/`
- Use TypeScript types everywhere
- Follow the dark theme
- Test on both iOS and Android
- Write descriptive commit messages
- Bump `version` and `buildNumber` before each App Store submission

**Don't**

- Store secret keys in app code (the Supabase anon key and Stripe publishable key are fine)
- Skip version bumps before submission
- Use mock data — always use real APIs
- Add spinning animations
- Expose users' real names in messaging — show artist names only

---

## Resources

- **Supabase Dashboard** — https://supabase.com/dashboard
- **Expo Dashboard** — https://expo.dev
- **App Store Connect** — https://appstoreconnect.apple.com
- **Stripe Dashboard** — https://dashboard.stripe.com
- **Expo docs** — https://docs.expo.dev/
- **React Native docs** — https://reactnative.dev/

Other docs in this repo: [scripts/MIGRATION.md](scripts/MIGRATION.md) (database migration scripts) and [src/features/README.md](src/features/README.md) (feature module conventions).
