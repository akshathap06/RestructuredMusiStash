-- Add last_name_change column to users table for tracking name change frequency
-- Users can only change their name once every 30 days

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN users.last_name_change IS 'Timestamp of last name change. Users can only change name once every 30 days.';





