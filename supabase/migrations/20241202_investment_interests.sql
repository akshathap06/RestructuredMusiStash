-- Migration: Create investment_interests table
-- Purpose: Track users who express interest in investing in artists
-- This data helps demonstrate demand for the investment feature to VCs/funding houses

CREATE TABLE IF NOT EXISTS investment_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a user can only register interest once per artist
  UNIQUE(user_id, artist_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_investment_interests_user_id ON investment_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_interests_artist_id ON investment_interests(artist_id);
CREATE INDEX IF NOT EXISTS idx_investment_interests_created_at ON investment_interests(created_at);

-- Enable RLS
ALTER TABLE investment_interests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own interest
CREATE POLICY "Users can insert their own investment interest"
  ON investment_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read their own interests
CREATE POLICY "Users can read their own investment interests"
  ON investment_interests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Allow counting interests for any artist (for public interest counts)
CREATE POLICY "Anyone can count interests per artist"
  ON investment_interests
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT ON investment_interests TO authenticated;

-- Comment on table
COMMENT ON TABLE investment_interests IS 'Tracks user interest in investing in artists. Used to demonstrate demand to VCs.';


