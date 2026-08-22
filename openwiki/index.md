---
okf_version: "0.1"
---

# Files

- [AI Mentor Chat](ai-mentor.md) - ai-mentor Deno edge function (Bearer auth, student-only server-side rate limit, post-success usage upsert, streaming SSE via Lovable AI gateway) and the StudentAIMentorChat client component with credit tracking.
- [AI Mock Exams](ai-mock-exams.md) - generate-mock-exam edge function (no caller auth, service-role writes, tool-calling, sanitization), ai_mock_exams/questions/answers tables, the realized scheduled-to-completed lifecycle, StudentExamMode, MockExamResults, ParentMockCreator, ParentExamResults, ExamHistoryCard, and the AI-exam to mock_exams bridge.
- [Authentication and Roles](auth-and-roles.md) - Supabase auth context, session restore, signup trigger, role enum, role-based UI gating, route guards, parent-vs-student access, and the single-student lookup assumption.
- [Class Schedule and Diary](classes.md) - class_schedules and class_entries tables, useClassData hook, ClassSchedule component, shared cross-user entry upsert, and parent schedule management.
- [Daily Practice Tracking](daily-practice.md) - daily_logs table, useDailyLogs hook, DailyLogForm, streak calculation, LevelProgress levels, RecentScores, WeeklyReport chart, and parent weekly summary dashboard.
- [Design System](design-system.md) - Tailwind CSS tokens, shadcn/ui primitives, custom gradients and animations, success/warning thresholds, and the 85% good-score cutoff used across StudyQuest.
- [Manual Mock Exam Tracker](mock-exam-tracker.md) - mock_exams table, useMockExams hook CRUD, MockExamTracker add/edit/delete with inline card rows, score badge thresholds, and the 7-day default filter.
- [Parent Dashboard and Tools](parent-dashboard.md) - Parent-specific views across the Dashboard and AI Mentor tabs, ParentSummaryDashboard on the main tab, and ParentMockCreator, ParentExamResults, ParentCreditSettings under the AI Mentor parent sub-tabs.
- [StudyQuest Wiki Quickstart](quickstart.md) - Entry point to the StudyQuest repository wiki — a Vite React Supabase app for tracking a student's 11+ Grammar School exam preparation with an AI mentor and AI-generated mock exams.

# Directories

- [architecture](architecture/)
