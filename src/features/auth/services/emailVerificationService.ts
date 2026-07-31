import { supabase } from '../../../lib/supabase';
import { twilioVerificationService } from './twilioVerificationService';

/**
 * Email Verification Service
 * 
 * Handles email verification code generation, storage, and validation
 * Uses Resend via Supabase Edge Function to send emails
 */

interface VerificationCodeData {
  email: string;
  code: string;
  expiresAt: number; // Unix timestamp
  verified: boolean;
}

// In-memory storage for verification codes (expires after 10 minutes)
// In production, you might want to use Redis or a database table
const verificationCodes = new Map<string, VerificationCodeData>();

const CODE_EXPIRY_MINUTES = 10;
const CODE_LENGTH = 4;

/**
 * Generate a random 4-digit verification code
 */
function generateVerificationCode(): string {
  const min = Math.pow(10, CODE_LENGTH - 1);
  const max = Math.pow(10, CODE_LENGTH) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}

/**
 * Store verification code with expiration
 */
function storeVerificationCode(email: string, code: string): void {
  const expiresAt = Date.now() + (CODE_EXPIRY_MINUTES * 60 * 1000);
  
  verificationCodes.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    code,
    expiresAt,
    verified: false,
  });
  
  // Clean up expired codes periodically
  cleanupExpiredCodes();
}

/**
 * Clean up expired verification codes
 */
function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(email);
    }
  }
}

class EmailVerificationService {
  /**
   * Send verification code to email via Resend
   * Returns the code for development/testing purposes
   */
  async sendVerificationCode(email: string): Promise<{
    success: boolean;
    message?: string;
    code?: string; // Only returned in dev mode
  }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim().toLowerCase())) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      // Check if email is already registered
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (existingUser) {
        return {
          success: false,
          message: 'This email is already registered. Please log in instead.',
        };
      }

      // Generate verification code
      const code = generateVerificationCode();
      
      // Store code with expiration
      storeVerificationCode(email, code);

      console.log(`📧 Sending verification code to ${email}`);
      console.log(`🔑 Generated code: ${code} (expires in ${CODE_EXPIRY_MINUTES} minutes)`);

      // Send email via Resend (using twilioVerificationService which calls Edge Function)
      const result = await twilioVerificationService.sendEmailVerification(email.trim());

      if (result.success) {
        // In development, return code for testing
        // In production, don't return the code
        const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
        if (isDev && result.code) {
          return {
            success: true,
            message: 'Verification code sent to your email',
            code: result.code, // For development only
          };
        }
        
        return {
          success: true,
          message: 'Verification code sent to your email',
        };
      } else {
        // Even if email fails, store code for development
        const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
        return {
          success: true,
          message: result.message || 'Verification code generated',
          code: isDev ? code : undefined, // Return for development only
        };
      }
    } catch (error: any) {
      console.error('❌ Error sending verification code:', error);
      return {
        success: false,
        message: error.message || 'Failed to send verification code',
      };
    }
  }

  /**
   * Verify the code entered by the user
   */
  async verifyCode(email: string, code: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const emailKey = email.trim().toLowerCase();
      const storedData = verificationCodes.get(emailKey);

      if (!storedData) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.',
        };
      }

      // Check if code has expired
      if (Date.now() > storedData.expiresAt) {
        verificationCodes.delete(emailKey);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
        };
      }

      // Check if code matches
      if (storedData.code !== code.trim()) {
        return {
          success: false,
          message: 'Invalid verification code. Please try again.',
        };
      }

      // Mark as verified
      storedData.verified = true;
      verificationCodes.set(emailKey, storedData);

      console.log(`✅ Email verified: ${email}`);
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('❌ Error verifying code:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify code',
      };
    }
  }

  /**
   * Check if email has been verified
   */
  isEmailVerified(email: string): boolean {
    const emailKey = email.trim().toLowerCase();
    const storedData = verificationCodes.get(emailKey);
    
    if (!storedData) {
      return false;
    }

    // Check if expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(emailKey);
      return false;
    }

    return storedData.verified === true;
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<{
    success: boolean;
    message?: string;
    code?: string;
  }> {
    // Remove old code
    verificationCodes.delete(email.trim().toLowerCase());
    
    // Send new code
    return this.sendVerificationCode(email);
  }

  /**
   * Clear verification data (after successful registration)
   */
  clearVerification(email: string): void {
    verificationCodes.delete(email.trim().toLowerCase());
  }
}

export const emailVerificationService = new EmailVerificationService();

