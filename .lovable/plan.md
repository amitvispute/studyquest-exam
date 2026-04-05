

# Delete Mock Exam & Daily Logs Test Data

## What will be deleted
- All rows from `mock_exams`
- All rows from `daily_logs`

## What will be kept
Everything else: `ai_mock_exams`, `ai_mock_answers`, `ai_mock_questions`, `ai_mentor_usage`, `ai_mentor_settings`, `profiles`, `user_roles`, `class_entries`, `class_schedules`

## How
Run two DELETE statements using the database insert tool:
```sql
DELETE FROM mock_exams;
DELETE FROM daily_logs;
```

No schema changes, no code changes needed.

