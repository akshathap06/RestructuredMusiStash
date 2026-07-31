-- Add verification status tracking for service providers
-- This tracks the multi-step onboarding process

ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS business_info_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_verification_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS can_list_services BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add comments
COMMENT ON COLUMN service_providers.onboarding_step IS 'Current step: 1=Business Info, 2=Stripe Verification, 3=Approved';
COMMENT ON COLUMN service_providers.business_info_completed IS 'Step 1: Basic business information submitted';
COMMENT ON COLUMN service_providers.stripe_verification_completed IS 'Step 2: Stripe Connect account verified';
COMMENT ON COLUMN service_providers.stripe_verification_date IS 'When Stripe verification was completed';
COMMENT ON COLUMN service_providers.can_list_services IS 'Whether provider can create/list services';
COMMENT ON COLUMN service_providers.verification_notes IS 'Admin notes or messages about verification status';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_providers_onboarding_step ON service_providers(onboarding_step);
CREATE INDEX IF NOT EXISTS idx_service_providers_can_list_services ON service_providers(can_list_services);

-- Update existing providers to have completed business info
UPDATE service_providers 
SET business_info_completed = true
WHERE business_name IS NOT NULL;

