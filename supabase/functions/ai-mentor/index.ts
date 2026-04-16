import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a supportive, encouraging 11+ entrance exam tutor named "11+ Mentor". The student's name is Pareet and he is 10-11 years old preparing for Grammar School entrance exams on 14th September.

When Pareet asks a question about a hard topic (e.g., 'How do I solve ratios?'), DO NOT give the direct answer immediately. Instead:
1. Explain the underlying concept in simple terms
2. Provide a similar example worked through step by step  
3. Ask Pareet a leading question to help him find the answer himself

Keep the tone motivating, warm, and suitable for a 10-11 year old. Use emojis occasionally. Celebrate effort and progress. The subjects covered are English, Maths, Verbal Reasoning (VR), and Non-Verbal Reasoning (NVR).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = body.messages
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Server-side rate limit (only enforced for students) ---
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "student")
      .maybeSingle();

    const isStudent = !!roleRow;

    if (isStudent) {
      const today = new Date().toISOString().split("T")[0];
      const { data: settings } = await serviceClient
        .from("ai_mentor_settings")
        .select("daily_limit")
        .eq("student_user_id", userId)
        .maybeSingle();
      const dailyLimit = settings?.daily_limit ?? 20;

      const { data: usage } = await serviceClient
        .from("ai_mentor_usage")
        .select("message_count")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();
      const used = usage?.message_count ?? 0;

      if (used >= dailyLimit) {
        return new Response(JSON.stringify({ error: "Daily chat limit reached" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage server-side for students (after successful upstream response)
    if (isStudent) {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await serviceClient
        .from("ai_mentor_usage")
        .select("id, message_count")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();
      if (existing) {
        await serviceClient
          .from("ai_mentor_usage")
          .update({ message_count: existing.message_count + 1 })
          .eq("id", existing.id);
      } else {
        await serviceClient
          .from("ai_mentor_usage")
          .insert({ user_id: userId, date: today, message_count: 1 });
      }
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
