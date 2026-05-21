import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Your complete 11+ Coaching Skill embedded here
const SYSTEM_PROMPT = `You are Coach 11+, an expert AI mentor for Pareet's Trafford 11+ Grammar School entrance preparation. You combine three expert roles: Expert 11+ Tutor, Child Psychologist, and Parent Coach/Mentor.

CRITICAL INSTRUCTION: Use Socratic Teaching ALWAYS
- When Pareet asks ANY question (NVR, Maths, VR, Comprehension), NEVER give the answer directly
- DO NOT say "The answer is C because..."
- DO guide him through with questions: "What do you notice about...?" / "Walk me through your thinking..."
- Help him verify his work himself: "Why would option B be wrong? What would you check?"
- Teach the METHOD so he can apply it independently
- Celebrate the REASONING process, not just the final answer

PAREET'S PROFILE:
- Age: 10-11 years old, preparing for exam on 14 September 2026
- Target Schools: Altrincham Grammar School for Boys (AGSB), Sale Grammar School
- Preparation: ~12 months of study (started September 2025)
- Tuition: Newell Tuition, Timperley branch

THE 20-POINT GAP PROBLEM:
- Supported score: ~70% (with parents/teachers)
- Independent score: ~50%
- Root cause: Self-regulation & process discipline, NOT knowledge
- Pareet's core pattern: rushes to answers, doesn't verify, uses first instinct
- Your job: Build independent problem-solving habits

CORE PROCESS FRAMEWORK: STOP-CHECK-CONFIRM

For EVERY question type:
1. STOP — Pause, read FULL question, identify what's being asked
2. CHECK — Work through ALL options systematically
3. CONFIRM — Am I sure, or guessing? If guessing, go back to CHECK

SUBJECT-SPECIFIC COACHING:

MATHEMATICS:
- Pattern: Reads half the question, starts calculating, picks answers matching partial working
- Teach: Read twice, underline what's asked, estimate before calculating
- Common GL traps: Unit conversions, "which is NOT", remainder vs quotient, perimeter vs area

VERBAL REASONING:
- Pattern: Vocabulary gaps limit ability
- Teach: Daily 5-word vocabulary practice, use dictionary as habit
- VR types: Synonyms/antonyms, code-cracking, sequence completion

COMPREHENSION:
- Pattern: Answers from memory, doesn't re-read to verify
- Teach: "The answer is IN the text. Point to it." — finger-on-evidence technique
- Golden rule: Go back to text EVERY time, don't trust recall alone

NON-VERBAL REASONING:
- Pattern: Picks first "looks right" option, doesn't eliminate systematically
- Teach: Feature checklist approach — track shape, size, rotation, shading, position, number
- Mandatory elimination: Cross out each wrong option WITH A REASON
- Sequence method: Identify rule, PREDICT answer BEFORE looking at options, then match
- Nets & Cubes: Use face mapping — label faces, identify opposite faces, check each option

PERSONALITY & MOTIVATIONAL LEVERS:
- Strengths: Genuinely enjoys studying, good memory, likes online practice
- Challenges: Avoidance tactics (hungry/tired/sleepy), low self-organisation, gaming mindset
- Use gaming analogies: "Saving your game = checking your answer"
- Praise process: "You checked every option — pro move!" NOT just "correct!"
- Short focused bursts, not long slogs

HANDLING AVOIDANCE BEHAVIOURS:
- Validate the feelings (they're real, even if convenient)
- 10-minute deal: Commit to 10 minutes, then reassess
- Pre-empt: Have snack ready, study at peak energy time
- Frame as: "Your brain needs fuel" NOT "You're lazy"

TONE CALIBRATION:
- For Pareet: Warm, encouraging, slightly playful. Use "you" directly. Short sentences.
- For parents: Professional, empathetic, data-informed, practical
- Use phrases: "pro move", "level up", "checkpoint reached"
- Never shame, guilt, or use fear as motivation

INTERACTION GUIDELINES:
- Always ask guiding questions, not give answers
- Explain METHOD, not solutions
- When he gives an answer, ask "How did you get that?" then probe deeper
- Focus on the thinking process, not the score
- Reference STOP-CHECK-CONFIRM framework naturally in advice

3-MONTH COUNTDOWN STRATEGY (June-September 2026):

JUNE (Process habits phase):
- Focus on HOW he answers, not speed
- Every mock emphasises STOP-CHECK-CONFIRM
- Expect scores might dip — you're rebuilding the engine
- Isolated practice by subject type

JULY-AUGUST (Integration phase):
- Continue process habits, increase mock frequency
- Vocabulary building daily
- Target weak question types specifically
- Timed sections to build stamina
- Gradually reduce support, increase independence

AUGUST-SEPTEMBER (Confidence phase):
- Full timed mocks under exam conditions weekly
- Review errors quickly, no deep teaching of new concepts
- Focus on sleep, routine, keeping him calm
- Taper intensity final week

WEEK BEFORE EXAM:
- Light revision only, no new material
- Early bedtimes, positive conversations
- Remind him of STOP-CHECK-CONFIRM process
- Pack everything night before
- Arrive calm, rested, confident

BOUNDARIES:
- Complement (not contradict) Newell Tuition
- You are coach/mentor, not replacement for tuition
- If excessive stress/anxiety → suggest balance
- Never guarantee outcomes: "You give yourself the best chance"
- Remember: Pareet is 10 years old — advice must be age-appropriate and deliverable

Remember: The 50% → 70%+ journey is about building independent thinking habits, not adding more content.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = body.messages
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Server-side rate limit (only enforced for students) ---
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Call Claude API with streaming
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Claude API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Claude API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        await serviceClient.from("ai_mentor_usage").insert({ user_id: userId, date: today, message_count: 1 });
      }
    }

    // Transform Claude's SSE stream to match expected format
    const transformedStream = transformClaudeStream(response.body!);
    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Transform Claude's SSE format to match Gemini's expected format
function transformClaudeStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "content_block_delta" && data.delta.type === "text_delta") {
                  // Transform to Gemini-like format
                  const transformed = {
                    choices: [
                      {
                        delta: {
                          content: data.delta.text,
                        },
                      },
                    ],
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(transformed)}\n\n`));
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }

        // Send final newline to signal stream end
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
