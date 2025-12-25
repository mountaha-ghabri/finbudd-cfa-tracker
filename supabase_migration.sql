-- ==========================================
-- FINBUDD CFA TRACKER - SUPABASE MIGRATION
-- ==========================================
-- Run this SQL in your Supabase SQL Editor
-- This sets up all necessary tables and RLS policies

-- ==========================================
-- 1. STUDENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  exam_date DATE DEFAULT '2025-08-20',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. STUDENT_PROGRESS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  video_coverage DECIMAL(5,2) DEFAULT 0 CHECK (video_coverage >= 0 AND video_coverage <= 100),
  quiz_coverage DECIMAL(5,2) DEFAULT 0 CHECK (quiz_coverage >= 0 AND quiz_coverage <= 100),
  avg_score DECIMAL(5,2) DEFAULT 0 CHECK (avg_score >= 0 AND avg_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, topic_id)
);

-- ==========================================
-- 3. QUIZ_SCORES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS quiz_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_topic_id ON student_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_student_id ON quiz_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_topic_id ON quiz_scores(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_quiz_id ON quiz_scores(quiz_id);

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. RLS POLICIES FOR STUDENTS TABLE
-- ==========================================
-- Students can read their own data
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (auth.uid() = id);

-- Students can update their own data
CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (auth.uid() = id);

-- Students can insert their own data (on signup)
CREATE POLICY "Students can insert own data" ON students
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all students
CREATE POLICY "Admins can view all students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Admins can update all students
CREATE POLICY "Admins can update all students" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- ==========================================
-- 7. RLS POLICIES FOR STUDENT_PROGRESS TABLE
-- ==========================================
-- Students can view their own progress
CREATE POLICY "Students can view own progress" ON student_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own progress
CREATE POLICY "Students can insert own progress" ON student_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own progress
CREATE POLICY "Students can update own progress" ON student_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Admins can insert/update all progress
CREATE POLICY "Admins can manage all progress" ON student_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- ==========================================
-- 8. RLS POLICIES FOR QUIZ_SCORES TABLE
-- ==========================================
-- Students can view their own quiz scores
CREATE POLICY "Students can view own quiz scores" ON quiz_scores
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own quiz scores
CREATE POLICY "Students can insert own quiz scores" ON quiz_scores
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Admins can view all quiz scores
CREATE POLICY "Admins can view all quiz scores" ON quiz_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Admins can insert all quiz scores
CREATE POLICY "Admins can insert all quiz scores" ON quiz_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- ==========================================
-- 9. FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for students table
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for student_progress table
CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON student_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 10. SET ADMIN USER (OPTIONAL)
-- ==========================================
-- To set a user as admin, run this SQL (replace 'user-email@example.com' with actual email):
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{is_admin}',
--   'true'::jsonb
-- )
-- WHERE email = 'user-email@example.com';

-- Or use this to set admin by user ID:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{is_admin}',
--   'true'::jsonb
-- )
-- WHERE id = 'user-uuid-here';

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. After running this migration, you need to manually set admin users
--    using the SQL commands in section 10 above
-- 2. The admin flag is stored in user_metadata (raw_user_meta_data in the database)
-- 3. All tables have proper foreign key constraints and cascading deletes
-- 4. RLS policies ensure data security - students can only see their own data
-- 5. Admins can see and manage all data
-- 6. The exam_date defaults to August 20, 2025 but can be changed per student
