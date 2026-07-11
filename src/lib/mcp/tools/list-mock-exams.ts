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
  name: "list_mock_exams",
  title: "List mock exams",
  description:
    "List AI-generated mock exams visible to the signed-in user (a student sees their own; a parent sees the ones they created).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max exams to return"),
    status: z
      .enum(["scheduled", "in_progress", "completed"])
      .optional()
      .describe("Optional status filter"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("ai_mock_exams")
      .select("id, title, subjects, status, num_questions, scheduled_start, scheduled_end, created_at")
      .order("scheduled_start", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { exams: data ?? [] },
    };
  },
});
