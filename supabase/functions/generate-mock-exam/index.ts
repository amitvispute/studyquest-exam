import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, subjects, topics, num_questions, student_user_id, scheduled_start, scheduled_end, parent_user_id } = await req.json();

    if (!title || !subjects?.length || !student_user_id || !scheduled_start || !scheduled_end || !parent_user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
      english: "english", maths: "maths", math: "maths", mathematics: "maths",
      vr: "vr", "verbal reasoning": "vr", "verbal-reasoning": "vr",
      nvr: "nvr", "non-verbal reasoning": "nvr", "non-verbal-reasoning": "nvr", "nonverbal reasoning": "nvr",
    };

    function stripJunk(s: string): string {
      return (s || "").replace(/[^\x20-\x7E]/g, "").replace(/,topic::.*$/i, "").trim();
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
      // Ensure correct_answer matches an option
      if (!q.options.includes(q.correct_answer)) {
        const match = q.options.find((o: string) => o.trim() === q.correct_answer.trim());
        if (match) q.correct_answer = match;
      }
      return q;
    }

    // Generate questions using AI with tool calling
    const subjectList = subjects.join(", ");
    const topicHint = topics ? ` focusing on topics: ${topics}` : "";
    const prompt = `Generate exactly ${num_questions} multiple-choice questions for an 11+ Grammar School entrance exam. Subjects: ${subjectList}${topicHint}. Each question must have exactly 4 options (A, B, C, D) and one correct answer. Questions should be appropriate for a 10-11 year old student. Distribute questions evenly across the requested subjects. IMPORTANT: Use ONLY these exact subject values (lowercase): english, maths, vr, nvr. Do not add any extra characters or text to the subject field.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an 11+ exam question generator. Generate high-quality multiple choice questions. For the subject field, use ONLY one of these exact lowercase values: english, maths, vr, nvr. Do not append any extra characters." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_questions",
              description: "Save the generated questions",
              parameters: {
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
                        subject: { type: "string" },
                        topic: { type: "string" },
                      },
                      required: ["question_text", "options", "correct_answer", "subject", "topic"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error("Failed to generate questions");
    }

    const aiData = await aiResponse.json();
    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!aiData.choices,
      choiceCount: aiData.choices?.length,
      hasToolCalls: !!aiData.choices?.[0]?.message?.tool_calls,
      toolCallCount: aiData.choices?.[0]?.message?.tool_calls?.length,
      hasContent: !!aiData.choices?.[0]?.message?.content,
      finishReason: aiData.choices?.[0]?.finish_reason,
    }));

    let questions: any[];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      questions = JSON.parse(toolCall.function.arguments).questions;
    } else {
      // Fallback: try to parse questions from message content
      const content = aiData.choices?.[0]?.message?.content || "";
      console.log("No tool_calls, attempting content parse. Content length:", content.length);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing as object with questions key
        const objMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
        if (objMatch) {
          questions = JSON.parse(objMatch[0]).questions;
        } else {
          console.error("Could not extract questions from content:", content.substring(0, 500));
          throw new Error("No questions generated");
        }
      }
    }

    if (!questions || questions.length === 0) throw new Error("No questions generated");

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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
