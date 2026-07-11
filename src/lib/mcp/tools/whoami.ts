import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in user's id, display name, and role (parent or student).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const client = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const [{ data: profile }, { data: role }] = await Promise.all([
      client.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    const info = {
      user_id: uid,
      email: ctx.getUserEmail() ?? null,
      display_name: profile?.display_name ?? null,
      role: role?.role ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      structuredContent: info,
    };
  },
});
