import { supabase } from '../../../lib/supabase';

const EMAIL_VERIFICATION_CODE_DIGITS = 4;

const generateEmailVerificationCode = (): string => {
  const min = Math.pow(10, EMAIL_VERIFICATION_CODE_DIGITS - 1);
  const max = Math.pow(10, EMAIL_VERIFICATION_CODE_DIGITS) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
};

interface VerificationResult {
  success: boolean;
  message?: string;
  code?: string; // For client-side validation (development only)
}

/**
 * Twilio Verification Service
 * 
 * Handles phone and email verification using Twilio via Supabase.
 * 
 * Setup Required:
 * 1. Configure Twilio in Supabase Dashboard (Auth → Settings → Phone Auth)
 * 2. Add your Twilio Account SID, Auth Token, and Messaging Service SID
 * 3. Deploy the send-verification-email Edge Function for email verification
 */
class TwilioVerificationService {
  
  // ============================================
  // PHONE VERIFICATION (SMS via Twilio)
  // ============================================
  
  /**
   * Send SMS verification code via Supabase + Twilio
   * Supabase automatically uses Twilio to send a 6-digit OTP
   */
  async sendPhoneVerification(phoneNumber: string): Promise<VerificationResult> {
    try {
      // Format phone number (must be E.164 format: +1234567890)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      console.log('📱 Sending SMS verification to:', formattedPhone);
      
      // Supabase will use Twilio to send OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          // Optional: customize the message template
          // (requires Twilio template configuration)
        }
      });
      
      if (error) {
        console.error('❌ SMS send error:', error);
        
        // Handle specific Twilio errors
        if (error.message.includes('rate limit')) {
          return {
            success: false,
            message: 'Too many requests. Please wait a moment and try again.',
          };
        }
        
        if (error.message.includes('invalid')) {
          return {
            success: false,
            message: 'Invalid phone number. Please check and try again.',
          };
        }
        
        return {
          success: false,
          message: error.message || 'Failed to send verification code',
        };
      }
      
      console.log('✅ SMS verification code sent successfully!');
      return {
        success: true,
        message: 'Verification code sent to your phone',
      };
      
    } catch (error: any) {
      console.error('❌ Error sending SMS:', error);
      return {
        success: false,
        message: error.message || 'Failed to send verification code',
      };
    }
  }
  
  /**
   * Verify the SMS code entered by the user
   * Validates against Twilio's OTP system via Supabase
   */
  async verifyPhoneCode(phoneNumber: string, code: string): Promise<VerificationResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      console.log('📱 Verifying code for:', formattedPhone);
      
      // Verify the OTP with Supabase (which validates via Twilio)
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms',
      });
      
      if (error) {
        console.error('❌ Verification error:', error);
        
        if (error.message.includes('expired')) {
          return {
            success: false,
            message: 'Verification code has expired. Please request a new one.',
          };
        }
        
        if (error.message.includes('invalid')) {
          return {
            success: false,
            message: 'Invalid verification code. Please try again.',
          };
        }
        
        return {
          success: false,
          message: error.message || 'Invalid verification code',
        };
      }
      
      if (!data.user) {
        return {
          success: false,
          message: 'Verification failed. Please try again.',
        };
      }
      
      console.log('✅ Phone verified successfully!', data.user.id);
      return {
        success: true,
        message: 'Phone number verified successfully',
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
   * Resend verification code to the phone number
   */
  async resendPhoneVerification(phoneNumber: string): Promise<VerificationResult> {
    console.log('📱 Resending verification code...');
    return this.sendPhoneVerification(phoneNumber);
  }
  
  // ============================================
  // EMAIL VERIFICATION (via Supabase Edge Function)
  // ============================================
  
  /**
   * Send email verification code via Supabase Edge Function + SendGrid
   * 
   * Note: Requires the send-verification-email Edge Function to be deployed
   * See TWILIO_SETUP_GUIDE.md for deployment instructions
   */
  async sendEmailVerification(email: string): Promise<VerificationResult> {
    try {
      // Generate 4-digit code to match onboarding UI
      const code = generateEmailVerificationCode();
      
      console.log('📧 Sending email verification to:', email);
      console.log('📧 Generated code:', code, '(for development)');
      
      // Call Supabase Edge Function to send email
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { email, code },
      });
      
      if (error) {
        console.error('❌ Email send error:', error);
        
        // If Edge Function not deployed, return code for development
        if (error.message.includes('not found') || error.message.includes('404')) {
          console.warn('⚠️  Edge Function not deployed. Using development mode.');
          return {
            success: true,
            message: 'Verification code sent (dev mode)',
            code, // Return code for local validation
          };
        }
        
        // Check for domain verification error
        if (error.message?.includes('DOMAIN_NOT_VERIFIED') || error.message?.includes('Domain not verified')) {
          console.error('❌ Domain not verified in Resend. Please verify musistash.com domain.');
          return {
            success: false,
            message: 'Email service not configured. Please verify domain in Resend dashboard.',
          };
        }
        
        return {
          success: false,
          message: error.message || 'Failed to send verification email',
        };
      }
      
      console.log('✅ Email verification code sent successfully!');
      return {
        success: true,
        message: 'Verification code sent to your email',
        code, // Return code for client-side validation
      };
      
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      
      // Fallback: generate code for development
      const code = generateEmailVerificationCode();
      console.log('📧 Fallback code for development:', code);
      
      return {
        success: true,
        message: 'Verification code generated (check console)',
        code,
      };
    }
  }
  
  /**
   * Resend email verification code
   */
  async resendEmailVerification(email: string): Promise<VerificationResult> {
    console.log('📧 Resending email verification code...');
    return this.sendEmailVerification(email);
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  /**
   * Format phone number to E.164 format required by Twilio
   * Example: (555) 123-4567 → +15551234567
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it's 10 digits, assume US and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it starts with 1 and is 11 digits, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it already has country code
    if (phone.startsWith('+')) {
      return phone.replace(/\D/g, '').replace(/^/, '+');
    }
    
    // Default: add + if missing
    return `+${digits}`;
  }
  
  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Basic validation: must start with + and have at least 10 digits
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(formatted);
  }
  
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Mask phone number for display (privacy)
   * Example: +15551234567 → +1 (555) ***-4567
   */
  maskPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const areaCode = digits.slice(1, 4);
      const lastFour = digits.slice(7);
      return `+1 (${areaCode}) ***-${lastFour}`;
    }
    return phone.replace(/.(?=.{4})/g, '*');
  }
  
  /**
   * Mask email for display (privacy)
   * Example: john.doe@example.com → j***e@example.com
   */
  maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username}***@${domain}`;
    }
    const masked = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${masked}@${domain}`;
  }
}

// Export singleton instance
export const twilioVerificationService = new TwilioVerificationService();

// Export type for convenience
export type { VerificationResult };

