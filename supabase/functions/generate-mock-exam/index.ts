import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, subjects, topics, num_questions, student_user_id, scheduled_start, scheduled_end, parent_user_id } =
      await req.json();

    if (!title || !subjects?.length || !student_user_id || !scheduled_start || !scheduled_end || !parent_user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create the exam record
    const { data: exam, error: examError } = await supabaseAdmin
      .from("ai_mock_exams")
      .insert({
        created_by: parent_user_id,
        student_user_id,
        title,
        subjects,
        topics: topics || "",
        num_questions,
        scheduled_start,
        scheduled_end,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (examError) throw examError;

    // Sanitization helpers
    const SUBJECT_MAP: Record<string, string> = {
      english: "english",
      maths: "maths",
      math: "maths",
      mathematics: "maths",
      vr: "vr",
      "verbal reasoning": "vr",
      "verbal-reasoning": "vr",
      nvr: "nvr",
      "non-verbal reasoning": "nvr",
      "non-verbal-reasoning": "nvr",
      "nonverbal reasoning": "nvr",
    };

    function stripJunk(s: string): string {
      return (s || "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/,topic::.*$/i, "")
        .trim();
    }

    function normalizeSubject(raw: string): string {
      const cleaned = stripJunk(raw).toLowerCase();
      return SUBJECT_MAP[cleaned] || "english";
    }

    function sanitizeQuestion(q: any) {
      q.subject = normalizeSubject(q.subject);
      q.topic = stripJunk(q.topic || "");
      q.correct_answer = (q.correct_answer || "").trim();
      q.options = (q.options || []).map((o: string) => (o || "").trim());
      if (!q.options.includes(q.correct_answer)) {
        const match = q.options.find((o: string) => o.trim() === q.correct_answer.trim());
        if (match) q.correct_answer = match;
      }
      return q;
    }

    // Generate questions using Claude API with tool calling
    const subjectList = subjects.join(", ");
    const topicHint = topics ? ` focusing on topics: ${topics}` : "";
    const prompt = `Generate exactly ${num_questions} multiple-choice questions for an 11+ Grammar School entrance exam. Subjects: ${subjectList}${topicHint}. Each question must have exactly 4 options (A, B, C, D) and one correct answer. Questions should be appropriate for a 10-11 year old student. Distribute questions evenly across the requested subjects. IMPORTANT: Use ONLY these exact subject values (lowercase): english, maths, vr, nvr. Do not add any extra characters or text to the subject field.`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        tools: [
          {
            name: "save_questions",
            description: "Save the generated questions",
            input_schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_text: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correct_answer: { type: "string", description: "The correct option text" },
                      subject: { type: "string", enum: ["english", "maths", "vr", "nvr"] },
                      topic: { type: "string" },
                    },
                    required: ["question_text", "options", "correct_answer", "subject", "topic"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        ],
        messages: [
          {
            role: "user",
            content: `You are an expert 11+ exam question generator. Generate high-quality multiple choice questions appropriate for the Trafford Grammar School entrance exam.

For the subject field, use ONLY one of these exact lowercase values: english, maths, vr, nvr.

${prompt}

Use the save_questions tool to return your generated questions.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Claude API error:", aiResponse.status, errorText);
      throw new Error("Failed to generate questions");
    }

    const aiData = await aiResponse.json();
    console.log(
      "Claude response:",
      JSON.stringify({
        hasContent: !!aiData.content,
        contentLength: aiData.content?.length,
        hasToolUse: aiData.content?.some((c: any) => c.type === "tool_use"),
      }),
    );

    let questions: any[];
    const toolUseBlock = aiData.content?.find((c: any) => c.type === "tool_use" && c.name === "save_questions");

    if (toolUseBlock) {
      questions = toolUseBlock.input.questions;
    } else {
      throw new Error("Claude did not use the tool as expected");
    }

    if (!questions || questions.length === 0) throw new Error("No questions generated");

    // Sanitize all questions
    questions = questions.map(sanitizeQuestion);

    // Insert questions
    const questionRows = questions.map((q: any, i: number) => ({
      exam_id: exam.id,
      question_number: i + 1,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      subject: q.subject,
      topic: q.topic || "",
    }));

    const { error: qError } = await supabaseAdmin.from("ai_mock_questions").insert(questionRows);
    if (qError) throw qError;

    return new Response(JSON.stringify({ exam_id: exam.id, questions_count: questionRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mock-exam error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
