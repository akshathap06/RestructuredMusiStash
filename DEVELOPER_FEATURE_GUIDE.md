# MusiStash Mobile - Developer Feature Guide

> **Complete reference for all app features, code locations, and how to edit them.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Authentication System](#authentication-system)
3. [User Profiles](#user-profiles)
4. [Artist Profiles](#artist-profiles)
5. [Service Provider Profiles](#service-provider-profiles)
6. [Posts & Feed](#posts--feed)
7. [Social Features](#social-features)
8. [Messaging System](#messaging-system)
9. [Service Booking & Payments](#service-booking--payments)
10. [Investment Feature](#investment-feature)
11. [Notifications](#notifications)
12. [Navigation Structure](#navigation-structure)
13. [Database Schema](#database-schema)
14. [Services Layer](#services-layer)

---

## Project Overview

### Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments**: Stripe Connect
- **State Management**: React Context API
- **Navigation**: React Navigation (Stack + Bottom Tabs)

### Directory Structure

```
src/
├── components/        # Reusable UI components
├── contexts/          # React Context providers
├── lib/               # External library configs (Supabase)
├── screens/           # All app screens
├── services/          # API/business logic layer
└── types/             # TypeScript type definitions
```

---

## Authentication System

### Features

- Email/Password login
- Google OAuth sign-in
- Email verification with OTP codes
- Password reset flow

### Code Locations

| Feature               | File                                         | Function/Component                  |
| --------------------- | -------------------------------------------- | ----------------------------------- |
| Auth Context          | `src/contexts/AuthContext.tsx`               | `AuthProvider`, `useAuth`           |
| Login                 | `src/screens/IntroScreenNew.tsx`             | `handleLogin`, `handleGoogleSignIn` |
| Register              | `src/screens/RegisterScreen.tsx`             | `handleRegister`                    |
| Email Verification    | `src/screens/EmailVerificationScreen.tsx`    | OTP input flow                      |
| Complete Registration | `src/screens/CompleteRegistrationScreen.tsx` | After email verified                |
| Password Reset        | `src/screens/ResetPasswordScreen.tsx`        | `handleResetPassword`               |
| Auth Service          | `src/services/authService.ts`                | All auth API calls                  |
| Email Service         | `src/services/emailVerificationService.ts`   | Send/verify OTP                     |

### How to Edit

**To modify login flow:**

```typescript
// src/contexts/AuthContext.tsx
const login = async (email: string, password: string): Promise<boolean> => {
  // Add your modifications here
  const result = await authService.login(email, password);
  // ...
};
```

**To add new OAuth provider:**

```typescript
// src/services/authService.ts
async signInWithApple(): Promise<{ success: boolean; error?: string }> {
  // Implement Apple sign-in
}
```

**Google OAuth Configuration:**

- Web Client ID is in `src/services/authService.ts`
- Redirect URIs configured in Google Cloud Console
- Supabase Auth settings must match

---

## User Profiles

### Features

- Basic user info (name, email, avatar)
- Profile picture upload
- Stats (posts, followers, following)
- User-created posts

### Code Locations

| Feature         | File                                       | Function/Component         |
| --------------- | ------------------------------------------ | -------------------------- |
| Profile Screen  | `src/screens/ProfileScreen.tsx`            | Main profile view          |
| Profile Data    | `src/services/productionProfileService.ts` | `getCompleteUserProfile`   |
| Profile Picture | `src/services/profilePictureService.ts`    | Upload/manage photos       |
| Edit Profile    | `src/screens/ProfileScreen.tsx`            | `handleEditProfilePicture` |

### Database Tables

```sql
-- users table
id, name, email, role, avatar, created_at
```

### How to Edit

**To add a new profile field:**

1. Add column to `users` table in Supabase
2. Update `src/services/productionProfileService.ts` to fetch it
3. Display in `ProfileScreen.tsx`

---

## Artist Profiles

### Features

- Artist name, bio, genre tags
- Profile & banner photos
- Monthly listeners, total streams, Spotify followers
- Verification badge
- Artist-specific posts

### Code Locations

| Feature         | File                                      | Function/Component |
| --------------- | ----------------------------------------- | ------------------ |
| Create Artist   | `src/screens/CreateArtistScreen.tsx`      | Multi-step form    |
| Artist Profile  | `src/screens/ArtistProfileScreen.tsx`     | Edit artist info   |
| View Artist     | `src/screens/ArtistProfileViewScreen.tsx` | Public view        |
| Browse Artists  | `src/screens/BrowseArtistsScreen.tsx`     | Discovery page     |
| Artists Service | `src/services/approvedArtistsService.ts`  | Fetch artists      |

### Database Tables

```sql
-- artist_profiles table
id, user_id, artist_name, bio, profile_photo, banner_photo,
genre[], monthly_listeners, total_streams, spotify_followers,
is_verified, status, created_at
```

### How to Edit

**To add new artist stat:**

1. Add column to `artist_profiles` table
2. Update `CreateArtistScreen.tsx` form
3. Display in `ArtistProfileViewScreen.tsx`

---

## Service Provider Profiles

### Features

- Business name, provider type, tagline, bio
- Contact info (email, phone, website, location)
- Years of experience, specializations, genres, skills
- Pricing (base price, hourly, project budgets)
- Stripe Connect integration for payments
- Service listings

### Code Locations

| Feature           | File                                             | Function/Component |
| ----------------- | ------------------------------------------------ | ------------------ |
| Create Provider   | `src/screens/CreateServiceProviderScreen.tsx`    | Multi-step form    |
| Provider Detail   | `src/screens/ServiceProviderDetailScreen.tsx`    | Public profile     |
| Dashboard         | `src/screens/ServiceProviderDashboardScreen.tsx` | Provider home      |
| Manage Services   | `src/screens/ManageServicesScreen.tsx`           | Service listings   |
| Manage Portfolio  | `src/screens/ManagePortfolioScreen.tsx`          | Portfolio items    |
| Provider Requests | `src/screens/ServiceProviderRequestsScreen.tsx`  | Incoming requests  |
| Stripe Service    | `src/services/stripeConnectService.ts`           | Stripe Connect     |

### Database Tables

```sql
-- service_providers table
id, user_id, business_name, provider_type, tagline, bio, about_section,
contact_email, phone, website_url, location, years_of_experience,
specializations[], genres[], skills[], base_price, price_per_hour,
min_project_budget, max_project_budget, turnaround_time_days,
profile_photo, social_links, status, stripe_account_id,
stripe_onboarding_complete, can_accept_payments, created_at
```

### Stripe Onboarding Flow

1. User creates service provider profile
2. System creates Stripe Connect account via Edge Function
3. User redirected to Stripe's hosted onboarding
4. Webhook updates `stripe_onboarding_complete` when done
5. Provider can now accept payments

### How to Edit

**To modify Stripe onboarding:**

```typescript
// src/services/stripeConnectService.ts
async createConnectAccount(providerId, email, businessName, country) {
  // Calls supabase/functions/create-connect-account
}
```

---

## Posts & Feed

### Features

- Text posts with optional media (images, video, audio)
- Service offer posts (for providers)
- Portfolio posts
- Like, comment, share
- Hashtag support

### Post Types

- `post` / `text` / `general` / `user_post` - Regular posts
- `service_offer` - Service listing (has price)
- `video_portfolio` - Portfolio showcase
- `future_release` - Artist music teasers
- `producer_sample` - Producer samples

### Code Locations

| Feature       | File                                 | Function/Component |
| ------------- | ------------------------------------ | ------------------ |
| Feed Screen   | `src/screens/PostsScreen.tsx`        | Main feed          |
| Create Post   | `src/screens/CreatePostScreen.tsx`   | Post creation      |
| Post Detail   | `src/screens/PostDetailScreen.tsx`   | Single post view   |
| Create Hub    | `src/screens/CreateHubScreen.tsx`    | Entry point        |
| Posts Service | `src/services/postsService.ts`       | CRUD operations    |
| Media Upload  | `src/services/mediaUploadService.ts` | File uploads       |

### Database Tables

```sql
-- posts table
id, user_id, content, media_urls[], post_type, title, description,
price, price_type, hashtags[], like_count, comment_count, created_at
```

### How to Edit

**To add new post type:**

1. Add type to `post_type` enum in database
2. Update `CreatePostScreen.tsx` to handle new type
3. Update `PostsScreen.tsx` to render it
4. Update `postsService.ts` if needed

---

## Social Features

### Follow System

| Feature         | File                            | Function                     |
| --------------- | ------------------------------- | ---------------------------- |
| Follow/Unfollow | `src/services/followService.ts` | `followUser`, `unfollowUser` |
| Check Following | `src/services/followService.ts` | `isFollowing`                |
| Get Followers   | `src/services/followService.ts` | `getFollowers`               |
| Get Following   | `src/services/followService.ts` | `getFollowing`               |

### Likes

| Feature     | File                           | Function           |
| ----------- | ------------------------------ | ------------------ |
| Like Post   | `src/services/postsService.ts` | `likePost`         |
| Unlike Post | `src/services/postsService.ts` | `unlikePost`       |
| Check Liked | `src/services/postsService.ts` | `hasUserLikedPost` |

### Comments

| Feature       | File                              | Function      |
| ------------- | --------------------------------- | ------------- |
| Comment Modal | `src/components/CommentModal.tsx` | UI component  |
| Add Comment   | `src/services/postsService.ts`    | `addComment`  |
| Get Comments  | `src/services/postsService.ts`    | `getComments` |

### Database Tables

```sql
-- follows table
id, follower_id, following_id, created_at

-- post_likes table
id, post_id, user_id, created_at

-- comments table
id, post_id, user_id, content, created_at
```

---

## Messaging System

### Features

- Direct messages between users
- Real-time updates
- Read receipts
- Conversation list
- New message creation

### Code Locations

| Feature           | File                               | Function/Component |
| ----------------- | ---------------------------------- | ------------------ |
| Messages List     | `src/screens/MessagesScreen.tsx`   | Conversation list  |
| Chat Screen       | `src/screens/ChatScreen.tsx`       | Individual chat    |
| New Message       | `src/screens/NewMessageScreen.tsx` | Start conversation |
| Messaging Service | `src/services/messagingService.ts` | All DM operations  |

### Database Tables

```sql
-- conversations table
id, participant_ids[], created_at, updated_at

-- messages table
id, conversation_id, sender_id, content, is_read, created_at
```

### How to Edit

**To add message attachments:**

1. Add `attachment_url` column to `messages` table
2. Update `ChatScreen.tsx` to handle attachments
3. Update `messagingService.ts` to upload files

---

## Service Booking & Payments

### Flow Overview

1. Client browses service provider's offerings
2. Client sends project request
3. Provider sends quote (price + timeline)
4. Client approves or counter-offers
5. Client makes payment (funds held)
6. Provider delivers work
7. Client approves delivery
8. Funds released to provider

### Code Locations

| Feature            | File                                            | Function/Component |
| ------------------ | ----------------------------------------------- | ------------------ |
| Request Service    | `src/screens/ServiceProviderDetailScreen.tsx`   | Book service       |
| Project Request    | `src/screens/ProjectRequestDetailsScreen.tsx`   | Request details    |
| My Orders (Client) | `src/screens/MyOrdersScreen.tsx`                | Client's requests  |
| Provider Requests  | `src/screens/ServiceProviderRequestsScreen.tsx` | Provider's inbox   |
| Payment Screen     | `src/screens/PaymentScreen.tsx`                 | Stripe checkout    |
| Submit Work        | `src/screens/SubmitWorkScreen.tsx`              | Provider delivery  |
| Request Service    | `src/services/projectRequestService.ts`         | Request CRUD       |
| Payment Service    | `src/services/stripePaymentService.ts`          | Payment handling   |
| Work Submission    | `src/services/WorkSubmissionService.ts`         | File delivery      |

### Database Tables

```sql
-- project_requests table
id, client_id, service_provider_id, service_type, project_description,
budget_range, timeline, status, created_at

-- project_agreements table
id, project_request_id, final_price, final_timeline, final_terms,
is_accepted, created_at

-- project_payments table
id, project_request_id, amount, status, stripe_payment_intent_id

-- work_submissions table
id, project_request_id, title, description, file_urls[], status
```

### Stripe Integration

**Edge Functions:**

- `supabase/functions/create-payment-intent/` - Create payment
- `supabase/functions/create-connect-account/` - Provider onboarding

**Payment Flow:**

```typescript
// src/services/stripePaymentService.ts
async createPaymentIntent(paymentData) {
  // Calls Edge Function
  // Returns clientSecret for PaymentSheet
}
```

### Delete Restrictions

- **Client cannot delete** if: payment made OR submission exists
- **Provider cannot delete** if: payment made

---

## Investment Feature

### Features

- Browse artists to potentially invest in
- "Join the Investment Movement" - collect interest
- Track interest counts per artist

### Code Locations

| Feature           | File                                      | Function/Component    |
| ----------------- | ----------------------------------------- | --------------------- |
| Browse Artists    | `src/screens/BrowseArtistsScreen.tsx`     | Artist discovery      |
| Artist Invest Tab | `src/screens/ArtistProfileViewScreen.tsx` | Investment CTA        |
| Artists Service   | `src/services/approvedArtistsService.ts`  | Fetch with pagination |

### Database Tables

```sql
-- investment_interests table
id, user_id, artist_id, artist_name, created_at
UNIQUE(user_id, artist_id)
```

---

## Notifications

### Features

- Project request notifications
- Quote updates
- Payment notifications
- Follow notifications

### Code Locations

| Feature              | File                                  | Function/Component |
| -------------------- | ------------------------------------- | ------------------ |
| Notifications Screen | `src/screens/NotificationsScreen.tsx` | List view          |
| Notification Service | `src/services/notificationService.ts` | CRUD operations    |

### Database Tables

```sql
-- project_notifications table
id, user_id, title, message, type, project_request_id, is_read, created_at
```

---

## Navigation Structure

### Main Navigator (App.tsx)

```
Root
├── Auth Stack (when not logged in)
│   ├── Intro
│   ├── Onboarding
│   ├── Register
│   ├── EmailVerification
│   └── CompleteRegistration
│
└── Main Tabs (when logged in)
    ├── Profile Tab
    │   ├── ProfileMain
    │   ├── ArtistProfile
    │   ├── CreateServiceProvider
    │   ├── Notifications
    │   └── ...more
    │
    ├── Investment Tab (BrowseArtists)
    │
    ├── Create Tab
    │   └── CreateHub → CreatePost
    │
    └── Posts Tab (Feed)
```

### How to Add New Screen

1. Create screen file in `src/screens/`
2. Register in `App.tsx`:

```typescript
<Stack.Screen name="NewScreen" component={NewScreen} />
```

3. Navigate to it:

```typescript
navigation.navigate("NewScreen", { param: value });
```

---

## Database Schema

### Core Tables

- `users` - User accounts
- `artist_profiles` - Artist data
- `service_providers` - Provider data
- `posts` - All post types
- `follows` - Follow relationships
- `post_likes` - Post likes
- `comments` - Post comments
- `conversations` - DM threads
- `messages` - Individual messages
- `project_requests` - Service requests
- `project_agreements` - Negotiated terms
- `project_payments` - Payment records
- `work_submissions` - Delivered work
- `project_notifications` - In-app notifications

### Supabase Setup

- **URL**: Configured in `src/lib/supabase.ts`
- **Storage Buckets**: `profile-pictures`, `post-media`, `work-submissions`
- **Edge Functions**: `supabase/functions/`

---

## Services Layer

All business logic is in `src/services/`. Each service handles specific domain:

| Service                       | Purpose          |
| ----------------------------- | ---------------- |
| `authService.ts`              | Authentication   |
| `postsService.ts`             | Posts CRUD       |
| `followService.ts`            | Follow system    |
| `messagingService.ts`         | DMs              |
| `projectRequestService.ts`    | Service requests |
| `stripePaymentService.ts`     | Payments         |
| `stripeConnectService.ts`     | Provider payouts |
| `notificationService.ts`      | Notifications    |
| `productionProfileService.ts` | Profile data     |
| `approvedArtistsService.ts`   | Artist discovery |
| `WorkSubmissionService.ts`    | File delivery    |
| `emailVerificationService.ts` | OTP codes        |

### Service Pattern

```typescript
// Example service structure
class ExampleService {
  async getItems(): Promise<Item[]> {
    const { data, error } = await supabase.from("items").select("*");
    if (error) throw error;
    return data;
  }
}

export const exampleService = new ExampleService();
```

---

## Quick Reference

### Common Edit Scenarios

| I want to...           | Edit this file                                         |
| ---------------------- | ------------------------------------------------------ |
| Change login UI        | `src/screens/IntroScreenNew.tsx`                       |
| Modify profile layout  | `src/screens/ProfileScreen.tsx`                        |
| Add new post type      | `src/screens/CreatePostScreen.tsx` + `postsService.ts` |
| Change payment flow    | `src/screens/PaymentScreen.tsx`                        |
| Update navigation      | `App.tsx`                                              |
| Add database query     | `src/services/*.ts`                                    |
| Modify Supabase config | `src/lib/supabase.ts`                                  |
| Change Edge Function   | `supabase/functions/*/index.ts`                        |

### Environment Variables

```bash
# In .env file
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...  # Only for Edge Functions
RESEND_API_KEY=re_...     # For email
```

---

## Need Help?

- Check console logs for errors
- Use React DevTools for component debugging
- Supabase Dashboard for database queries
- Stripe Dashboard for payment issues

**Happy coding! 🚀**
