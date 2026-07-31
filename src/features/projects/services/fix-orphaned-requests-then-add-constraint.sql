-- PRODUCTION-READY FIX: Clean up orphaned requests, then add constraints
-- This script fixes data integrity issues BEFORE adding the foreign key constraint

-- ============================================
-- STEP 1: DIAGNOSE - Find orphaned requests
-- ============================================
SELECT 
  'DIAGNOSIS: Orphaned Requests' as step,
  COUNT(*) as orphaned_count,
  array_agg(DISTINCT pr.service_provider_id) as orphaned_provider_ids
FROM project_requests pr
LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
WHERE pr.service_provider_id IS NOT NULL 
  AND sp.id IS NULL;

-- Show details of orphaned requests
SELECT 
  'Orphaned Request Details' as info_type,
  pr.id as request_id,
  pr.service_provider_id,
  pr.client_id,
  pr.service_type,
  pr.status,
  pr.created_at
FROM project_requests pr
LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
WHERE pr.service_provider_id IS NOT NULL 
  AND sp.id IS NULL
ORDER BY pr.created_at DESC
LIMIT 20;

-- ============================================
-- STEP 2: FIX - Clean up orphaned requests
-- ============================================
-- Option A: Set orphaned service_provider_id to NULL (preserves request data)
-- This is the safest option - keeps the request but removes the broken link
UPDATE project_requests
SET service_provider_id = NULL
WHERE service_provider_id IS NOT NULL
  AND service_provider_id NOT IN (SELECT id FROM service_providers);

-- Show how many were fixed
SELECT 
  'FIX APPLIED' as step,
  COUNT(*) as requests_fixed
FROM project_requests
WHERE service_provider_id IS NULL
  AND id IN (
    SELECT id FROM project_requests pr
    LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
    WHERE pr.service_provider_id IS NOT NULL AND sp.id IS NULL
  );

-- ============================================
-- STEP 3: VERIFY - Check no orphaned requests remain
-- ============================================
SELECT 
  'VERIFICATION' as step,
  COUNT(*) as remaining_orphaned
FROM project_requests pr
LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
WHERE pr.service_provider_id IS NOT NULL 
  AND sp.id IS NULL;

-- ============================================
-- STEP 4: ADD CONSTRAINTS (now safe to do)
-- ============================================
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_service_provider'
  ) THEN
    ALTER TABLE project_requests
    ADD CONSTRAINT fk_service_provider
    FOREIGN KEY (service_provider_id)
    REFERENCES service_providers(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Foreign key constraint added successfully';
  ELSE
    RAISE NOTICE '✅ Foreign key constraint already exists';
  END IF;
END $$;

-- ============================================
-- STEP 5: ADD INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_requests_service_provider_id 
ON project_requests(service_provider_id);

CREATE INDEX IF NOT EXISTS idx_project_requests_client_id 
ON project_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_service_providers_user_id 
ON service_providers(user_id);

-- ============================================
-- STEP 6: FINAL VERIFICATION
-- ============================================
SELECT 
  'FINAL STATUS' as step,
  (SELECT COUNT(*) FROM project_requests WHERE service_provider_id IS NOT NULL) as requests_with_provider,
  (SELECT COUNT(*) FROM project_requests WHERE service_provider_id IS NULL) as requests_without_provider,
  (SELECT COUNT(*) FROM project_requests pr
   LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
   WHERE pr.service_provider_id IS NOT NULL AND sp.id IS NULL) as orphaned_requests,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_provider'
    ) THEN '✅ Foreign key constraint exists'
    ELSE '❌ Foreign key constraint missing'
  END as constraint_status;

SELECT '✅ Data cleanup and constraints applied successfully!' AS result;








