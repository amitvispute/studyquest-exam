import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "log_study_session",
  title: "Log a study session",
  description:
    "Record a study session (subject, minutes, questions attempted, score) for the signed-in student. Date defaults to today.",
  inputSchema: {
    subject: z.string().trim().min(1).describe("Subject studied (e.g. Maths, VR, NVR, English)"),
    minutes: z.number().int().min(0).max(600).describe("Minutes spent studying"),
    questions: z.number().int().min(0).max(1000).default(0).describe("Questions attempted"),
    score: z.number().int().min(0).max(1000).default(0).describe("Questions answered correctly"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Optional date (YYYY-MM-DD); defaults to today"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async ({ subject, minutes, questions, score, date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const row: Record<string, unknown> = {
      user_id: ctx.getUserId(),
      subject,
      minutes,
      questions,
      score,
    };
    if (date) row.date = date;
    const { data, error } = await supabaseForUser(ctx).from("daily_logs").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${minutes}m of ${subject}.` }],
      structuredContent: { log: data },
    };
  },
});
