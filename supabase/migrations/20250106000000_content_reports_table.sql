-- Content Reports Table for Apple Compliance
-- This table stores user reports for moderation review

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_content_id UUID,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'user', 'service', 'artist')),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at DESC);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view all reports (add admin role check when implemented)
-- CREATE POLICY "Admins can view all reports" ON content_reports
--   FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Add comment explaining the table
COMMENT ON TABLE content_reports IS 'Stores user reports for content moderation (Apple App Store compliance)';
COMMENT ON COLUMN content_reports.content_type IS 'Type of content being reported: post, comment, message, user, service, or artist';
COMMENT ON COLUMN content_reports.status IS 'Moderation status: pending, reviewing, resolved, or dismissed';





