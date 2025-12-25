# Finbudd CFA Tracker - Setup Guide

## 🎨 Features

- **Burgundy & Glassmorphism Design**: Beautiful glassmorphic UI with burgundy color scheme
- **Exam Date Selection**: Students can set and update their exam date
- **Comprehensive Tracking**: Quiz scores, video coverage, and progress tracking
- **Admin Dashboard**: Global KPI table showing all students' progress
- **Weighted Scoring**: Topic-weighted average scores
- **Real-time Updates**: Automatic progress calculations

## 📋 Database Setup

### Step 1: Run SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_migration.sql`
4. Click **Run** to execute the migration

This will create:
- `students` table (with exam_date column)
- `student_progress` table
- `quiz_scores` table
- All necessary indexes and RLS policies

### Step 2: Set Admin Users

After running the migration, you need to manually set admin users. Run this SQL in the Supabase SQL Editor:

```sql
-- Set admin by email
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE email = 'your-admin-email@example.com';
```

Or set admin by user ID:

```sql
-- Set admin by user ID (find the ID in Supabase Auth > Users)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE id = 'user-uuid-here';
```

**Note**: The admin flag is stored in `user_metadata` (which maps to `raw_user_meta_data` in the database). This is automatic - you just need to set it once per admin user.

## 🚀 Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (usually `http://localhost:5173`)

## 📊 How to Use

### For Students:

1. **Sign Up/Login**: Create an account or sign in
2. **Set Exam Date**: Click "Change Exam Date" to set your CFA exam date
3. **Track Progress**: 
   - Click on any topic card to add quiz scores
   - Update video coverage percentage
   - View your progress across all topics
4. **Monitor KPIs**: 
   - Quiz Coverage: Percentage of quizzes completed
   - Average Score: Your average quiz score
   - Video Coverage: Percentage of videos watched
   - Overall Progress: Combined metric

### For Admins:

1. **Login**: Sign in with an admin account
2. **Switch Views**: Use the top-right buttons to switch between Student View and Admin View
3. **View Global Dashboard**: 
   - See all students in a comprehensive KPI table
   - Monitor overall class performance
   - Track individual student progress
4. **Key Metrics**:
   - Total Students
   - Average Quiz Coverage
   - Average Score
   - Average Video Coverage
   - Individual student status (On Track / Needs Work / At Risk)

## 🎯 Formulas & Calculations

### Quiz Coverage
- Formula: `(Number of unique quizzes completed / 50) * 100`
- Each topic has 50 possible quizzes (LOS-based)

### Average Score
- Formula: `Sum of last attempt scores / Number of quizzes`
- Uses the most recent attempt for each quiz

### Weighted Score
- Formula: `Sum of (Topic Score × Topic Weight) / Sum of Weights`
- Topic weights match CFA Level 1 exam weights:
  - Ethics: 15%
  - Financial Statement Analysis: 15%
  - Equity Investments: 11%
  - Fixed Income: 11%
  - Quantitative Methods: 10%
  - Economics: 10%
  - Corporate Issuers: 10%
  - Derivatives: 6%
  - Alternative Investments: 6%
  - Portfolio Management: 6%

### Overall Progress
- Formula: `(Quiz Coverage + Video Coverage) / 2`
- Combined metric showing overall study progress

## 🔒 Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Student Access**: Students can only view/edit their own data
- **Admin Access**: Admins can view/edit all student data
- **Authentication**: Uses Supabase Auth for secure user management

## 🎨 Design Features

- **Burgundy Color Scheme**: Primary colors (#8B1A3D, #A02040, etc.)
- **Glassmorphism**: Backdrop blur effects with semi-transparent backgrounds
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface with smooth transitions

## 📝 Database Schema

### students
- `id` (UUID, Primary Key, references auth.users)
- `name` (TEXT)
- `email` (TEXT, Unique)
- `exam_date` (DATE, default: '2025-08-20')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### student_progress
- `id` (UUID, Primary Key)
- `student_id` (UUID, Foreign Key)
- `topic_id` (TEXT)
- `video_coverage` (DECIMAL 0-100)
- `quiz_coverage` (DECIMAL 0-100)
- `avg_score` (DECIMAL 0-100)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- Unique constraint on (student_id, topic_id)

### quiz_scores
- `id` (UUID, Primary Key)
- `student_id` (UUID, Foreign Key)
- `topic_id` (TEXT)
- `quiz_id` (TEXT, e.g., "LM1-LOS1")
- `score` (DECIMAL 0-100)
- `created_at` (TIMESTAMP)

## 🐛 Troubleshooting

### Admin not working?
1. Check that you've run the SQL to set `is_admin` in user metadata
2. Sign out and sign back in to refresh the session
3. Check browser console for any errors

### Data not loading?
1. Verify RLS policies are set up correctly
2. Check that tables exist in Supabase
3. Verify your Supabase URL and API key are correct

### Can't add quiz scores?
1. Make sure you're logged in
2. Check that the topic is selected
3. Verify quiz_id and score are valid (score 0-100)

## 📞 Support

For issues or questions, check:
- Supabase Dashboard for database errors
- Browser Console for frontend errors
- Network tab for API request issues

---

**Built with ❤️ for CFA Level 1 students**
