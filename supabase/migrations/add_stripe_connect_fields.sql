-- Migration: Add Stripe Connect fields to service_providers table
-- This allows service providers to receive payments through Stripe Connect

DO $$ 
BEGIN
    -- Add stripe_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_account_id'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_account_id VARCHAR(255) UNIQUE;
        RAISE NOTICE 'Added stripe_account_id column';
    END IF;
    
    -- Add stripe_onboarding_complete if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_onboarding_complete'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added stripe_onboarding_complete column';
    END IF;
    
    -- Add stripe_charges_enabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_charges_enabled'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added stripe_charges_enabled column';
    END IF;
    
    -- Add stripe_payouts_enabled if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_payouts_enabled'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added stripe_payouts_enabled column';
    END IF;
    
    -- Add stripe_onboarding_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_onboarding_url'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_onboarding_url TEXT;
        RAISE NOTICE 'Added stripe_onboarding_url column';
    END IF;
    
    -- Add stripe_account_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'stripe_account_status'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN stripe_account_status VARCHAR(50) DEFAULT 'not_started';
        RAISE NOTICE 'Added stripe_account_status column';
    END IF;
    
    -- Add can_accept_payments if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'can_accept_payments'
    ) THEN
        ALTER TABLE service_providers 
        ADD COLUMN can_accept_payments BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added can_accept_payments column';
    END IF;
    
    RAISE NOTICE 'Stripe Connect fields migration completed successfully';
END $$;

-- Create index on stripe_account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_providers_stripe_account_id 
ON service_providers(stripe_account_id);

-- Create index on stripe_account_status for filtering
CREATE INDEX IF NOT EXISTS idx_service_providers_stripe_status 
ON service_providers(stripe_account_status);

-- Create index on can_accept_payments for filtering
CREATE INDEX IF NOT EXISTS idx_service_providers_can_accept_payments 
ON service_providers(can_accept_payments);

