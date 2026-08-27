// ============================================
// SERVICES INDEX - Re-exports for backward compatibility
// ============================================
// Services are organized by feature in src/features/. Prefer importing from
// the feature directly; these re-exports exist for older import paths.

// Auth
export * from '../features/auth/services/authService';
export * from '../features/auth/services/emailVerificationService';
export * from '../features/auth/services/twilioVerificationService';

// Profile
export * from '../features/profile/services/productionProfileService';
export * from '../features/profile/services/optimizedProfileService';
export { default as ProfilePictureService } from '../features/profile/services/profilePictureService';

// Artists
export * from '../features/artists/services/approvedArtistsService';
export * from '../features/artists/services/artistAccountService';

// Posts
export * from '../features/posts/services/postsService';
export * from '../features/posts/services/optimizedPostsService';
export * from '../features/posts/services/mediaUploadService';

// Notifications
export * from '../features/notifications/services/notificationService';

// Social
export * from '../features/social/services/followService';

// AI
export * from '../features/ai/services/agenticManagerService';

// Moderation
export * from './moderationService';
