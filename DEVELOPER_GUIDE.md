# MusiStash Mobile Developer Guide

> **Complete reference for software engineers working on the MusiStash iOS/Android mobile app**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Feature Modules](#feature-modules)
6. [Navigation Architecture](#navigation-architecture)
7. [Authentication System](#authentication-system)
8. [Database & Backend](#database--backend)
9. [Payments Integration](#payments-integration)
10. [Key Services](#key-services)
11. [Styling & Theming](#styling--theming)
12. [Building & Deploying](#building--deploying)
13. [Common Tasks](#common-tasks)
14. [Troubleshooting](#troubleshooting)

---

## Project Overview

MusiStash is a music industry platform that connects:
- **Artists** - Musicians who want to grow their careers
- **Service Providers** - Producers, engineers, designers, etc. who offer music services
- **Listeners** - Fans and potential investors

The app enables service marketplace transactions, messaging, project management, and social features.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo (SDK 54)** | Development tooling & native APIs |
| **TypeScript** | Type-safe JavaScript |
| **Supabase** | Backend (PostgreSQL + Auth + Storage + Edge Functions) |
| **Stripe** | Payment processing (Connect for payouts) |
| **React Navigation 7** | Navigation (Stack + Bottom Tabs) |
| **AsyncStorage** | Local data persistence |

---

## Getting Started

### Prerequisites
- Node.js 22.x
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (for iOS development)
- iOS Simulator or physical device

### Installation

```bash
# Clone the repository
cd musistash-mobile-clean

# Install dependencies
npm install

# Start development server
npm start
# or
expo start

# Run on iOS Simulator
# Press 'i' in the terminal after server starts
```

### Environment Setup
The app uses hardcoded configuration (no .env files). Key configs are in:
- `src/lib/supabase.ts` - Supabase connection
- `src/config/stripeConfig.ts` - Stripe keys

---

## Project Structure

```
musistash-mobile-clean/
├── App.tsx                    # Root component, navigation setup
├── app.json                   # Expo configuration
├── eas.json                   # EAS Build configuration
├── package.json               # Dependencies
├── assets/                    # Images, fonts, splash screen
├── ios/                       # Native iOS project files
│   └── MusiStash/
│       └── Info.plist         # iOS configuration
├── src/
│   ├── components/            # Shared UI components
│   ├── config/                # App configuration
│   ├── contexts/              # React contexts (legacy)
│   ├── features/              # 🔥 FEATURE MODULES (main code)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Core libraries (Supabase)
│   ├── navigation/            # (empty - nav in App.tsx)
│   ├── screens/               # Legacy screens (prefer features/)
│   ├── services/              # Legacy services (prefer features/)
│   ├── shared/                # Shared utilities
│   ├── styles/                # Theme & global styles
│   └── utils/                 # Utility functions
└── supabase/
    ├── functions/             # Edge Functions (serverless)
    └── migrations/            # Database migrations
```

---

## Feature Modules

The app follows a **feature-based architecture**. Each feature is self-contained with its own screens, services, and components.

### 📁 `src/features/` Directory

| Feature | Path | Description |
|---------|------|-------------|
| **auth** | `features/auth/` | Login, registration, onboarding, password reset |
| **profile** | `features/profile/` | User profile, search users |
| **artists** | `features/artists/` | Artist profiles, browse artists |
| **service-providers** | `features/service-providers/` | Service provider profiles & dashboard |
| **posts** | `features/posts/` | Social feed, create posts |
| **messaging** | `features/messaging/` | Chat, conversations |
| **payments** | `features/payments/` | Stripe payments, earnings |
| **projects** | `features/projects/` | Project requests, work submissions |
| **delivery** | `features/delivery/` | File delivery for completed projects |
| **notifications** | `features/notifications/` | Push notifications |
| **settings** | `features/settings/` | App settings, account management |
| **files** | `features/files/` | File uploads & transfers |
| **reviews** | `features/reviews/` | Service provider reviews |
| **social** | `features/social/` | Follow/unfollow system |
| **ai** | `features/ai/` | AI agentic manager |

### Feature Module Structure

Each feature follows this pattern:

```
features/[feature-name]/
├── screens/           # Screen components
│   └── FeatureScreen.tsx
├── services/          # API & business logic
│   └── featureService.ts
├── components/        # Feature-specific components
│   └── FeatureCard.tsx
└── [FeatureContext.tsx]  # Optional context provider
```

---

## Navigation Architecture

Navigation is defined in `App.tsx`. The app has two main navigation stacks:

### Authentication Stack (`AuthStack`)
For unauthenticated users:

```
Welcome → Intro → Login/Register → Onboarding → RoleSelection → [Artist/Service Onboarding]
```

**Key Screens:**
| Screen | File | Purpose |
|--------|------|---------|
| `WelcomeCarouselScreen` | `features/auth/screens/WelcomeCarouselScreen.tsx` | Welcome slides |
| `IntroScreenNew` | `features/auth/screens/IntroScreenNew.tsx` | Sign in options |
| `LoginScreen` | `features/auth/screens/LoginScreen.tsx` | Email/password login |
| `OnboardingScreen` | `features/auth/screens/OnboardingScreen.tsx` | New user signup |
| `RoleSelectionScreen` | `features/auth/screens/RoleSelectionScreen.tsx` | Choose: Listener/Artist/Provider |
| `ArtistOnboardingScreen` | `features/auth/screens/ArtistOnboardingScreen.tsx` | Artist profile setup |
| `ServiceProviderOnboardingScreen` | `features/auth/screens/ServiceProviderOnboardingScreen.tsx` | Provider setup |

### Main Stack (`MainStack`)
For authenticated users:

```
MainTabs (Bottom Navigation)
├── Profile Tab → ProfileScreen
├── Investment Tab → BrowseArtistsScreen
├── Create Tab → CreateHubScreen
└── Posts Tab → PostsScreen
```

**Key Screens:**
| Screen | File | Purpose |
|--------|------|---------|
| `ProfileScreen` | `features/profile/screens/ProfileScreen.tsx` | User's own profile |
| `BrowseArtistsScreen` | `features/artists/screens/BrowseArtistsScreen.tsx` | Discover artists |
| `CreateHubScreen` | `features/posts/screens/CreateHubScreen.tsx` | Create content/services |
| `PostsScreen` | `features/posts/screens/PostsScreen.tsx` | Social feed |
| `MessagesScreen` | `features/messaging/screens/MessagesScreen.tsx` | Conversations |
| `ChatScreen` | `features/messaging/screens/ChatScreen.tsx` | Individual chat |
| `ServiceProviderDashboardScreen` | `features/service-providers/screens/ServiceProviderDashboardScreen.tsx` | Provider dashboard |

### Adding a New Screen

1. Create the screen file in the appropriate feature:
```tsx
// features/[feature]/screens/NewScreen.tsx
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

2. Import and add to `App.tsx`:
```tsx
// In App.tsx
import NewScreen from './src/features/[feature]/screens/NewScreen';

// Add to MainStack or AuthStack
<Stack.Screen
  name="NewScreen"
  component={NewScreen}
  options={{ headerShown: false }}
/>
```

3. Navigate to it:
```tsx
navigation.navigate('NewScreen');
```

---

## Authentication System

### AuthContext (`features/auth/AuthContext.tsx`)

The central authentication state manager. Provides:

```tsx
const { 
  user,              // Current user object
  isAuthenticated,   // Boolean login state
  isLoading,         // Auth loading state
  needsOnboarding,   // New user flag
  login,             // Login function
  register,          // Register function
  logout,            // Logout function
  signOut,           // Alias for logout
} = useAuth();
```

### User Object Structure
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;        // 'listener', 'artist', 'service_provider'
  avatar?: string;
}
```

### Authentication Flow

1. **Login**: `authService.login(email, password)` → Supabase Auth
2. **Register**: `authService.register(name, email, phone, password)` → Creates auth + users record
3. **OAuth**: Google/Apple sign-in via Supabase
4. **Session**: Persisted in AsyncStorage via Supabase client

### Key Auth Files
| File | Purpose |
|------|---------|
| `features/auth/AuthContext.tsx` | Auth state provider |
| `features/auth/services/authService.ts` | Auth API calls |
| `features/auth/services/twilioVerificationService.ts` | Email OTP verification |

---

## Database & Backend

### Supabase Configuration (`src/lib/supabase.ts`)

```typescript
import { supabase } from '../../lib/supabase';

// Query data
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Insert data
const { data, error } = await supabase
  .from('artist_profiles')
  .insert({ user_id, artist_name, bio })
  .select()
  .single();

// Update data
const { error } = await supabase
  .from('users')
  .update({ name: newName })
  .eq('id', userId);
```

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts |
| `artist_profiles` | Artist-specific data |
| `service_providers` | Service provider profiles |
| `posts` | Social feed posts |
| `service_listings` | Services offered by providers |
| `project_requests` | Client requests for services |
| `work_submissions` | Delivered work files |
| `messages` | Chat messages |
| `conversations` | Chat threads |
| `followers` | Follow relationships |
| `reviews` | Service reviews |

### Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `create-connect-account` | Create Stripe Connect account |
| `create-payment-intent` | Process payments |
| `send-verification-email` | Send OTP emails |
| `stripe-connect-webhook` | Handle Stripe webhooks |
| `get-secure-file-url` | Signed URLs for files |

---

## Payments Integration

### Stripe Configuration

The app uses **Stripe Connect** for marketplace payments:
- Clients pay for services
- Platform takes a fee
- Providers receive payouts

### Key Payment Files

| File | Purpose |
|------|---------|
| `features/payments/StripeContext.tsx` | Stripe provider wrapper |
| `features/payments/services/stripeConnectService.ts` | Connect account management |
| `features/payments/services/stripePaymentService.ts` | Payment processing |
| `features/payments/screens/PaymentScreen.tsx` | Payment UI |
| `src/config/stripeConfig.ts` | Stripe keys |

### Payment Flow

1. Client selects service → `PaymentScreen`
2. Create payment intent → `stripePaymentService.createPaymentIntent()`
3. Confirm payment → Stripe SDK
4. Webhook updates database → `stripe-connect-webhook`
5. Provider receives payout → Stripe Connect

---

## Key Services

Services handle business logic and API calls. Located in `features/[feature]/services/`.

### Commonly Used Services

| Service | File | Purpose |
|---------|------|---------|
| `ProductionProfileService` | `features/profile/services/productionProfileService.ts` | Profile data with caching |
| `ApprovedArtistsService` | `features/artists/services/approvedArtistsService.ts` | Browse artists |
| `ArtistAccountService` | `features/artists/services/artistAccountService.ts` | Artist CRUD |
| `ServiceProviderService` | `features/service-providers/services/serviceProviderService.ts` | Provider CRUD |
| `MessagingService` | `features/messaging/services/messagingService.ts` | Chat functionality |
| `PostsService` | `features/posts/services/postsService.ts` | Posts CRUD |
| `ProjectRequestService` | `features/projects/services/projectRequestService.ts` | Project requests |
| `WorkSubmissionService` | `features/projects/services/WorkSubmissionService.ts` | File submissions |
| `FollowService` | `features/social/services/followService.ts` | Follow/unfollow |
| `ReviewService` | `features/reviews/services/reviewService.ts` | Reviews |

### Service Pattern

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

  static async createData(payload: CreateExamplePayload) {
    const { data, error } = await supabase
      .from('examples')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
```

---

## Styling & Theming

### Theme (`src/styles/theme.ts`)

The app uses a dark theme with the `MusiStashTheme` object:

```typescript
import { MusiStashTheme } from '../../../styles/theme';

// Usage
<View style={{ backgroundColor: MusiStashTheme.colors.background }}>
  <Text style={{ color: MusiStashTheme.colors.white }}>Hello</Text>
</View>
```

### Key Colors
- **Background**: `#000000` (black)
- **Text**: `#FFFFFF` (white)
- **Accent/Primary**: `#3B82F6` (blue)
- **Success**: `#10B981` (green)
- **Error**: `#EF4444` (red)
- **Gray variants**: `#6B7280`, `#9CA3AF`, `#374151`

### Styling Conventions

1. **Inline styles** for simple cases
2. **StyleSheet.create()** for reusable styles
3. **Dark background** (`#000000`) on all screens
4. **White/light text** for readability
5. **Border radius**: 12-16px for cards, 8-12px for buttons
6. **Spacing**: Use multiples of 4 (4, 8, 12, 16, 24, 32)

### Common UI Patterns

```tsx
// Screen container
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Building & Deploying

### Development Build

```bash
# Start Expo dev server
npm start

# Run on iOS Simulator
# Press 'i' in terminal
```

### Production Build (App Store)

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Version Management

**IMPORTANT**: When submitting to App Store:

1. Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.0.2",      // Marketing version
    "ios": {
      "buildNumber": "1"      // Build number (increment each submission)
    }
  }
}
```

2. Update native `ios/MusiStash/Info.plist`:
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.2</string>
<key>CFBundleVersion</key>
<string>1</string>
```

### EAS Build Profiles (`eas.json`)

| Profile | Purpose |
|---------|---------|
| `development` | Development client builds |
| `preview` | Internal testing (TestFlight) |
| `production` | App Store release |

---

## Common Tasks

### Adding a New Feature

1. Create feature directory:
```
src/features/my-feature/
├── screens/
│   └── MyFeatureScreen.tsx
├── services/
│   └── myFeatureService.ts
└── components/
    └── MyFeatureCard.tsx
```

2. Create the screen component
3. Create the service for API calls
4. Import and add screen to `App.tsx`
5. Add navigation from existing screens

### Adding a New Database Table

1. Create migration in `supabase/migrations/`
2. Run migration in Supabase Dashboard
3. Create TypeScript types
4. Create service methods
5. Use in screens

### Adding a New API Endpoint

1. Create Edge Function in `supabase/functions/`
2. Deploy: `supabase functions deploy function-name`
3. Call from app using fetch or supabase client

### Modifying User Profile Fields

1. Update `users` table in Supabase
2. Update `User` interface in `src/lib/supabase.ts`
3. Update `AuthContext` if needed
4. Update `ProfileScreen` and `ProfileSettingsScreen`

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install`, restart Metro |
| iOS build fails | `cd ios && pod install && cd ..` |
| Supabase connection fails | Check network, verify URL/keys |
| Navigation not working | Check screen is registered in `App.tsx` |
| Styles not applying | Check StyleSheet syntax, component hierarchy |
| Auth not persisting | Check AsyncStorage, Supabase session config |

### Debug Logging

The app has extensive console logging. Use Metro bundler terminal or React Native Debugger to view logs:

```
🔔 Auth state changed: SIGNED_IN
✅ User authenticated: user@email.com
📦 Profile data loaded
```

### Useful Commands

```bash
# Clear Metro cache
npx expo start --clear

# Reset iOS Simulator
xcrun simctl erase all

# Check Expo doctor
npx expo-doctor

# View EAS build logs
eas build:list
```

---

## Important Notes

### Do's ✅
- Keep feature code in `src/features/`
- Use TypeScript types everywhere
- Follow dark theme styling
- Test on both iOS and Android
- Commit with descriptive messages

### Don'ts ❌
- Don't store secrets in code (except Supabase anon key)
- Don't skip version bumps before App Store submission
- Don't use mock data (always use real APIs)
- Don't add spinning animations (user preference)
- Don't expose real names in messaging (show artist names only)

---

## Contacts & Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Expo Dashboard**: https://expo.dev
- **App Store Connect**: https://appstoreconnect.apple.com
- **Stripe Dashboard**: https://dashboard.stripe.com

---

*Last Updated: February 2026*
*Version: 1.0.2*

