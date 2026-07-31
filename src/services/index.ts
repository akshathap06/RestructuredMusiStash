// ============================================
// SERVICES INDEX - Re-exports for backward compatibility
// ============================================
// This file maintains compatibility with old import paths
// Services are now organized by feature in src/features/

// Auth Services
export * from '../features/auth/services/authService';
export * from '../features/auth/services/emailVerificationService';
export * from '../features/auth/services/twilioVerificationService';

// Profile Services
export * from '../features/profile/services/productionProfileService';
export * from '../features/profile/services/optimizedProfileService';
export { default as ProfilePictureService } from '../features/profile/services/profilePictureService';

// Artist Services
export * from '../features/artists/services/approvedArtistsService';
export * from '../features/artists/services/artistAccountService';

// Service Provider Services
export * from '../features/service-providers/services/serviceProviderService';
export * from '../features/service-providers/services/serviceProviderStatsService';
export * from '../features/service-providers/services/serviceListingService';

// Project Services
export * from '../features/projects/services/projectRequestService';
export * from '../features/projects/services/projectDeliveryService';
export * from '../features/projects/services/WorkSubmissionService';

// Payment Services
export { default as stripePaymentService } from '../features/payments/services/stripePaymentService';
export * from '../features/payments/services/stripeConnectService';
export * from '../features/payments/services/paymentIntegrationService';
export * from '../features/payments/services/paymentDeliveryService';
export * from '../features/payments/services/realPaymentService';
export * from '../features/payments/services/simplePaymentService';

// Posts Services
export * from '../features/posts/services/postsService';
export * from '../features/posts/services/optimizedPostsService';

// Messaging Services
export * from '../features/messaging/services/messagingService';

// Notifications Services
export * from '../features/notifications/services/notificationService';

// Reviews Services
export * from '../features/reviews/services/reviewService';

// Files Services
export * from '../features/files/services/mediaUploadService';
export * from '../features/files/services/fileTransferService';

// Social Services
export * from '../features/social/services/followService';

// AI Services
export * from '../features/ai/services/agenticManagerService';

// Moderation Services
export * from './moderationService';






