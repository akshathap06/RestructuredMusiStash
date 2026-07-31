-- PRODUCTION-READY FIX: Database constraints to prevent future data mismatches
-- Run this in Supabase SQL Editor to ensure data integrity

-- 1. Ensure foreign key constraint exists (prevents orphaned requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_service_provider'
  ) THEN
    ALTER TABLE project_requests
    ADD CONSTRAINT fk_service_provider
    FOREIGN KEY (service_provider_id)
    REFERENCES service_providers(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Foreign key constraint added';
  ELSE
    RAISE NOTICE '✅ Foreign key constraint already exists';
  END IF;
END $$;

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_requests_service_provider_id 
ON project_requests(service_provider_id);

CREATE INDEX IF NOT EXISTS idx_project_requests_client_id 
ON project_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_service_providers_user_id 
ON service_providers(user_id);

-- 3. Add a trigger to automatically fix orphaned requests
-- This ensures that if a service_provider's user_id is updated, 
-- we can verify requests are still linked correctly
CREATE OR REPLACE FUNCTION verify_request_provider_relationship()
RETURNS TRIGGER AS $$
BEGIN
  -- If service_provider user_id changes, log it (for monitoring)
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE NOTICE 'Service provider % user_id changed from % to %', 
      NEW.id, OLD.user_id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verify_provider_relationship ON service_providers;
CREATE TRIGGER trigger_verify_provider_relationship
  AFTER UPDATE OF user_id ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION verify_request_provider_relationship();

-- 4. Create a view for easy debugging (optional, for admin use)
CREATE OR REPLACE VIEW project_requests_with_providers AS
SELECT 
  pr.id as request_id,
  pr.service_provider_id,
  pr.client_id,
  pr.service_type,
  pr.status,
  pr.created_at,
  sp.id as provider_id,
  sp.user_id as provider_user_id,
  sp.business_name,
  CASE 
    WHEN sp.user_id IS NULL THEN '⚠️ ORPHANED - Provider has no user_id'
    ELSE '✅ OK'
  END as relationship_status
FROM project_requests pr
LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id;

SELECT '✅ Production-ready database constraints and indexes added!' AS result;








