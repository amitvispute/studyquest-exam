import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMockExams from "./tools/list-mock-exams";
import logStudySession from "./tools/log-study-session";
import listRecentLogs from "./tools/list-recent-logs";
import whoami from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "studyquest-mcp",
  title: "StudyQuest MCP",
  version: "0.1.0",
  instructions:
    "Tools for StudyQuest, an 11+ exam prep app. Use `whoami` to check the signed-in user, `list_mock_exams` to see AI mock exams, `list_recent_logs` to view study history, and `log_study_session` to record a study session.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMockExams, listRecentLogs, logStudySession],
});
