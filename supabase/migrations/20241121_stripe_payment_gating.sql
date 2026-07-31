-- Migration: Stripe Payment Gating for Service Providers
-- Created: 2024-11-21
-- Description: Ensures only verified service providers can list services and accept payments

-- ============================================================================
-- 1. Ensure service_providers table has required Stripe columns
-- ============================================================================

DO $$ 
BEGIN
    -- Add stripe_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_account_id'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_account_id TEXT;
    END IF;

    -- Add stripe_onboarding_complete if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_onboarding_complete'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
    END IF;

    -- Add stripe_charges_enabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_charges_enabled'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add stripe_payouts_enabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_payouts_enabled'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Add stripe_onboarding_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_onboarding_url'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_onboarding_url TEXT;
    END IF;

    -- Add stripe_account_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'stripe_account_status'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN stripe_account_status TEXT DEFAULT 'not_started';
    END IF;

    -- Add can_accept_payments if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'can_accept_payments'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN can_accept_payments BOOLEAN DEFAULT false;
    END IF;

    -- Add onboarding_step if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' AND column_name = 'onboarding_step'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN onboarding_step INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_providers_stripe_account_id 
ON service_providers(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_service_providers_can_accept_payments 
ON service_providers(can_accept_payments);

-- ============================================================================
-- 2. Row Level Security Policies for service_listings
-- ============================================================================

-- Enable RLS on service_listings if not already enabled
ALTER TABLE service_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Only verified providers can create listings" ON service_listings;
DROP POLICY IF EXISTS "Only verified providers can update listings" ON service_listings;
DROP POLICY IF EXISTS "Only verified providers can delete listings" ON service_listings;
DROP POLICY IF EXISTS "Anyone can view published listings" ON service_listings;
DROP POLICY IF EXISTS "Providers can view their own listings" ON service_listings;

-- Policy: Only verified providers can create listings
CREATE POLICY "Only verified providers can create listings"
ON service_listings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.can_accept_payments = true
    AND service_providers.stripe_onboarding_complete = true
  )
);

-- Policy: Only verified providers can update their listings
CREATE POLICY "Only verified providers can update listings"
ON service_listings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.can_accept_payments = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.can_accept_payments = true
  )
);

-- Policy: Only verified providers can delete their listings
CREATE POLICY "Only verified providers can delete listings"
ON service_listings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.can_accept_payments = true
  )
);

-- Policy: Anyone can view published listings from verified providers
CREATE POLICY "Anyone can view published listings"
ON service_listings
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.can_accept_payments = true
  )
);

-- Policy: Providers can view their own listings (published or not)
CREATE POLICY "Providers can view their own listings"
ON service_listings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_providers
    WHERE service_providers.id = service_listings.service_provider_id
    AND service_providers.user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. Trigger to prevent listing publication without verification
-- ============================================================================

CREATE OR REPLACE FUNCTION check_provider_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to publish a listing
  IF NEW.is_published = true THEN
    -- Check if provider is verified
    IF NOT EXISTS (
      SELECT 1 FROM service_providers
      WHERE id = NEW.service_provider_id
      AND can_accept_payments = true
      AND stripe_onboarding_complete = true
    ) THEN
      RAISE EXCEPTION 'Cannot publish listing: Stripe verification incomplete. Complete Stripe onboarding first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_provider_verification ON service_listings;

-- Create trigger
CREATE TRIGGER enforce_provider_verification
  BEFORE INSERT OR UPDATE ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION check_provider_verification();

-- ============================================================================
-- 4. Helper function to check if provider can accept payments
-- ============================================================================

CREATE OR REPLACE FUNCTION can_provider_accept_payments(provider_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT 
    COALESCE(can_accept_payments, false)
  INTO result
  FROM service_providers
  WHERE id = provider_id;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. View for provider payment status
-- ============================================================================

CREATE OR REPLACE VIEW provider_payment_status AS
SELECT 
  sp.id,
  sp.user_id,
  sp.business_name,
  sp.stripe_account_id,
  sp.stripe_onboarding_complete,
  sp.stripe_charges_enabled,
  sp.stripe_payouts_enabled,
  sp.can_accept_payments,
  sp.stripe_account_status,
  sp.onboarding_step,
  CASE 
    WHEN sp.can_accept_payments = true THEN 'Ready to accept payments'
    WHEN sp.stripe_account_id IS NULL THEN 'Stripe account not created'
    WHEN sp.stripe_onboarding_complete = false THEN 'Onboarding incomplete'
    WHEN sp.stripe_charges_enabled = false THEN 'Charges not enabled'
    WHEN sp.stripe_payouts_enabled = false THEN 'Payouts not enabled'
    ELSE 'Unknown status'
  END as status_message,
  (
    SELECT COUNT(*)
    FROM service_listings
    WHERE service_provider_id = sp.id
  ) as total_listings,
  (
    SELECT COUNT(*)
    FROM service_listings
    WHERE service_provider_id = sp.id
    AND is_published = true
  ) as published_listings
FROM service_providers sp;

-- Grant access to authenticated users
GRANT SELECT ON provider_payment_status TO authenticated;

-- ============================================================================
-- 6. Comments for documentation
-- ============================================================================

COMMENT ON COLUMN service_providers.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN service_providers.stripe_onboarding_complete IS 'Whether provider completed Stripe onboarding';
COMMENT ON COLUMN service_providers.stripe_charges_enabled IS 'Whether provider can accept charges';
COMMENT ON COLUMN service_providers.stripe_payouts_enabled IS 'Whether provider can receive payouts';
COMMENT ON COLUMN service_providers.can_accept_payments IS 'Master flag: true only when fully verified and ready';
COMMENT ON COLUMN service_providers.stripe_account_status IS 'Status: not_started, pending, restricted, complete';
COMMENT ON COLUMN service_providers.onboarding_step IS 'Current onboarding step: 1=Business Info, 2=Stripe, 3=Ready';

-- ============================================================================
-- 7. Initial data cleanup (optional)
-- ============================================================================

-- Set all existing providers to not_started if they don't have Stripe setup
UPDATE service_providers
SET 
  stripe_account_status = 'not_started',
  can_accept_payments = false,
  onboarding_step = 1
WHERE stripe_account_id IS NULL
AND stripe_account_status IS NULL;

-- Update providers who have Stripe accounts but status is unclear
UPDATE service_providers
SET can_accept_payments = (
  stripe_charges_enabled = true 
  AND stripe_payouts_enabled = true 
  AND stripe_onboarding_complete = true
)
WHERE stripe_account_id IS NOT NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Stripe payment gating migration completed successfully';
  RAISE NOTICE 'Service providers must complete Stripe verification to list services';
  RAISE NOTICE 'Platform fee: 2%% (configured in Edge functions)';
END $$;

