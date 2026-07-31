-- PRODUCTION-READY FIX: Handle orphaned requests when service_provider_id is NOT NULL
-- This script fixes data integrity issues and adds constraints safely

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
ORDER BY pr.created_at DESC;

-- ============================================
-- STEP 2: CHECK IF service_provider_id IS NOT NULL
-- ============================================
SELECT 
  'Column Constraint Check' as step,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'project_requests' 
  AND column_name = 'service_provider_id';

-- ============================================
-- STEP 3: FIX OPTIONS
-- ============================================
-- Option A: Remove NOT NULL constraint, then set orphaned to NULL
-- This preserves all request data

-- First, remove the NOT NULL constraint if it exists
DO $$
BEGIN
  -- Check if column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'project_requests' 
      AND column_name = 'service_provider_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE project_requests 
    ALTER COLUMN service_provider_id DROP NOT NULL;
    
    RAISE NOTICE '✅ Removed NOT NULL constraint from service_provider_id';
  ELSE
    RAISE NOTICE '✅ service_provider_id already allows NULL';
  END IF;
END $$;

-- Now set orphaned service_provider_id to NULL
UPDATE project_requests
SET service_provider_id = NULL
WHERE service_provider_id IS NOT NULL
  AND service_provider_id NOT IN (SELECT id FROM service_providers);

-- Show how many were fixed
SELECT 
  'FIX APPLIED' as step,
  COUNT(*) as requests_fixed
FROM project_requests
WHERE service_provider_id IS NULL;

-- ============================================
-- STEP 4: VERIFY - Check no orphaned requests remain
-- ============================================
SELECT 
  'VERIFICATION' as step,
  COUNT(*) as remaining_orphaned
FROM project_requests pr
LEFT JOIN service_providers sp ON pr.service_provider_id = sp.id
WHERE pr.service_provider_id IS NOT NULL 
  AND sp.id IS NULL;

-- ============================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINT (now safe)
-- ============================================
DO $$
BEGIN
  -- Drop existing constraint if it exists (in case of previous failed attempt)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_service_provider'
  ) THEN
    ALTER TABLE project_requests
    DROP CONSTRAINT fk_service_provider;
    
    RAISE NOTICE '✅ Dropped existing foreign key constraint';
  END IF;
  
  -- Add foreign key constraint
  ALTER TABLE project_requests
  ADD CONSTRAINT fk_service_provider
  FOREIGN KEY (service_provider_id)
  REFERENCES service_providers(id)
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ Foreign key constraint added successfully';
END $$;

-- ============================================
-- STEP 6: ADD INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_requests_service_provider_id 
ON project_requests(service_provider_id);

CREATE INDEX IF NOT EXISTS idx_project_requests_client_id 
ON project_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_service_providers_user_id 
ON service_providers(user_id);

-- ============================================
-- STEP 7: FINAL VERIFICATION
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
  END as constraint_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'project_requests' 
        AND column_name = 'service_provider_id'
        AND is_nullable = 'YES'
    ) THEN '✅ service_provider_id allows NULL'
    ELSE '❌ service_provider_id is NOT NULL'
  END as nullable_status;

SELECT '✅ Data cleanup and constraints applied successfully!' AS result;








