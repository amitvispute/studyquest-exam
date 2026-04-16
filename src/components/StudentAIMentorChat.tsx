import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, CalendarIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StudentExamMode from "@/components/StudentExamMode";
import ExamHistoryCard from "@/components/ExamHistoryCard";
import MockExamResults from "@/components/MockExamResults";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_TOPICS = [
  { label: "Algebra Tips", emoji: "➗", prompt: "Can you teach me how to solve algebra problems for 11+?" },
  { label: "Vocabulary Tricks", emoji: "📝", prompt: "What are some good tricks to learn new vocabulary for 11+?" },
  { label: "Logic Puzzles", emoji: "🧩", prompt: "Can you help me with logic puzzle strategies for 11+?" },
  { label: "Comprehension Help", emoji: "📖", prompt: "How do I improve my reading comprehension for 11+?" },
];

const StudentAIMentorChat = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reviewExamId, setReviewExamId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStudent = role === "student";

  // Check for active exam (student only)
  const { data: activeExam } = useQuery({
    queryKey: ["student_active_exam"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .eq("student_user_id", user!.id)
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("scheduled_start", { ascending: true });
      if (!data) return null;
      const now = new Date();
      return data.find(
        (e: any) => new Date(e.scheduled_start) <= now && new Date(e.scheduled_end) > now
      ) || null;
    },
    enabled: !!user && isStudent,
    refetchInterval: 30000,
  });

  // Credit limit tracking (student only)
  const { data: creditInfo } = useQuery({
    queryKey: ["ai_mentor_credit_info"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data: settings } = await supabase
        .from("ai_mentor_settings")
        .select("daily_limit")
        .eq("student_user_id", user!.id)
        .single();
      const { data: usage } = await supabase
        .from("ai_mentor_usage")
        .select("message_count")
        .eq("user_id", user!.id)
        .eq("date", today)
        .single();
      return {
        limit: settings?.daily_limit ?? 20,
        used: usage?.message_count ?? 0,
      };
    },
    enabled: !!user && isStudent,
  });

  // Fetch all exams for history
  const { data: allExams = [] } = useQuery({
    queryKey: ["student_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .eq("student_user_id", user!.id)
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && isStudent,
  });

  const historyExams = allExams.filter(
    (e) => e.status === "completed" || e.status === "expired"
  );

  const completedExamIds = historyExams.filter(e => e.status === "completed").map(e => e.id);

  // Fetch answers & questions for score breakdowns
  const { data: allAnswers = [] } = useQuery({
    queryKey: ["all_exam_answers", completedExamIds],
    queryFn: async () => {
      if (completedExamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ai_mock_answers")
        .select("exam_id, question_id, is_correct")
        .in("exam_id", completedExamIds);
      if (error) throw error;
      return data;
    },
    enabled: completedExamIds.length > 0,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["all_exam_questions", completedExamIds],
    queryFn: async () => {
      if (completedExamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ai_mock_questions")
        .select("id, exam_id, subject")
        .in("exam_id", completedExamIds);
      if (error) throw error;
      return data;
    },
    enabled: completedExamIds.length > 0,
  });

  // For review mode: fetch full questions + answers
  const { data: reviewQuestions = [] } = useQuery({
    queryKey: ["exam_questions", reviewExamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_questions")
        .select("*")
        .eq("exam_id", reviewExamId!)
        .order("question_number");
      if (error) throw error;
      return data;
    },
    enabled: !!reviewExamId,
  });

  const { data: reviewAnswers = [] } = useQuery({
    queryKey: ["exam_answers", reviewExamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_answers")
        .select("*")
        .eq("exam_id", reviewExamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!reviewExamId,
  });

  const reviewAnswerMap = useMemo(() => {
    const map: Record<string, string> = {};
    reviewAnswers.forEach((a: any) => { map[a.question_id] = a.student_answer; });
    return map;
  }, [reviewAnswers]);

  // Build score maps
  const examScores = useMemo(() => {
    const map: Record<string, { scores: Record<string, { correct: number; total: number }>; total: { correct: number; total: number } }> = {};
    completedExamIds.forEach(eid => {
      const qs = allQuestions.filter(q => q.exam_id === eid);
      const ans = allAnswers.filter(a => a.exam_id === eid);
      const ansMap = new Map(ans.map(a => [a.question_id, a.is_correct]));
      const scores: Record<string, { correct: number; total: number }> = {};
      let totalCorrect = 0;
      qs.forEach(q => {
        const subj = q.subject?.toLowerCase() || "unknown";
        if (!scores[subj]) scores[subj] = { correct: 0, total: 0 };
        scores[subj].total++;
        if (ansMap.get(q.id)) { scores[subj].correct++; totalCorrect++; }
      });
      map[eid] = { scores, total: { correct: totalCorrect, total: qs.length } };
    });
    return map;
  }, [allQuestions, allAnswers, completedExamIds]);

  // Calendar data
  const completedDates = historyExams.filter(e => e.status === "completed").map(e => new Date(e.scheduled_start));
  const missedDates = historyExams.filter(e => e.status === "expired").map(e => new Date(e.scheduled_start));

  const displayExams = selectedDate
    ? historyExams.filter(e => isSameDay(new Date(e.scheduled_start), selectedDate))
    : historyExams.slice(0, 4);

  const isExhausted = isStudent && creditInfo && creditInfo.used >= creditInfo.limit;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshUsage = () => {
    if (!user || !isStudent) return;
    queryClient.invalidateQueries({ queryKey: ["ai_mentor_credit_info"] });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (isStudent && creditInfo && creditInfo.used >= creditInfo.limit) {
      toast.error("You've used all your chats for today! Come back tomorrow or ask your parent for more. 💬");
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok || !resp.body) throw new Error("Failed to get response");

      if (isStudent) {
        await refreshUsage();
        if (creditInfo && creditInfo.used + 1 >= creditInfo.limit * 0.8 && creditInfo.used + 1 < creditInfo.limit) {
          toast.warning(`Running low on chats! ${creditInfo.limit - creditInfo.used - 1} left today 💬`);
        }
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! I had a little hiccup. Try asking me again! 🤔" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // If there's an active exam (student only), show exam mode
  if (isStudent && activeExam) {
    return <StudentExamMode />;
  }

  // If reviewing a completed exam
  if (reviewExamId && reviewQuestions.length > 0) {
    const exam = allExams.find(e => e.id === reviewExamId);
    return (
      <MockExamResults
        questions={reviewQuestions as any}
        answers={reviewAnswerMap}
        examTitle={exam?.title || "Mock Exam"}
        canReview={true}
        onBack={() => setReviewExamId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming exam banner (student only) */}
      {isStudent && <StudentExamMode />}

      {/* Credit exhausted banner */}
      {isExhausted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-center">
          <p className="text-lg mb-1">😴</p>
          <p className="font-semibold text-foreground">Chats used up for today!</p>
          <p className="text-sm text-muted-foreground">Come back tomorrow or ask your parent for more credits.</p>
        </div>
      )}

      {/* Chat widget */}
      <div className="bg-card rounded-2xl shadow-card border border-border flex flex-col h-[550px]">
        <div className="gradient-primary rounded-t-2xl p-5 flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
          <div className="flex-1">
            <h3 className="font-bold text-primary-foreground text-xl">11+ Mentor</h3>
            <p className="text-primary-foreground/70 text-sm">Your AI study buddy</p>
          </div>
          {isStudent && creditInfo && (
            <span className="text-xs text-primary-foreground/60">
              {creditInfo.used}/{creditInfo.limit} used
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-5xl mb-3">👋</p>
              <p className="text-foreground font-semibold text-lg">Hi! What shall we learn today?</p>
              <p className="text-base text-muted-foreground mt-1">Pick a topic or ask me anything!</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                {QUICK_TOPICS.map((topic) => (
                  <Button
                    key={topic.label}
                    variant="outline"
                    size="lg"
                    className="text-left justify-start min-h-[48px] text-xs sm:text-sm px-3 sm:px-4 py-3 whitespace-normal min-w-0"
                    onClick={() => sendMessage(topic.prompt)}
                    disabled={!!isExhausted}
                  >
                    <span className="mr-2 text-lg shrink-0">{topic.emoji}</span>
                    <span className="break-words">{topic.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-base ${msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-base max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-5 py-4 text-base text-muted-foreground">Thinking... 🤔</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isExhausted ? "Daily limit reached" : "Ask me anything about 11+..."}
              className="flex-1 h-12 text-base"
              disabled={isLoading || !!isExhausted}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim() || !!isExhausted} className="h-12 w-12">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Recent Exam History section */}
      {isStudent && historyExams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">📊 Recent Exam History</h3>
            <div className="flex items-center gap-2">
              {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="text-xs text-muted-foreground">
                  Clear filter
                </Button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? format(selectedDate, "d MMM yyyy") : "Filter"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className={cn("p-3 pointer-events-auto")}
                    modifiers={{
                      completed: completedDates,
                      missed: missedDates,
                    }}
                    modifiersStyles={{
                      completed: { backgroundColor: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))", fontWeight: "bold" },
                      missed: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))", fontWeight: "bold" },
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {displayExams.length > 0 ? (
            <div className="space-y-3">
              {displayExams.map((e) => (
                <ExamHistoryCard
                  key={e.id}
                  exam={e}
                  scores={examScores[e.id]?.scores}
                  totalScore={examScores[e.id]?.total}
                  onReview={e.status === "completed" ? () => setReviewExamId(e.id) : undefined}
                />
              ))}
            </div>
          ) : (
            selectedDate && (
              <p className="text-sm text-muted-foreground text-center py-4">No exams on this date</p>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAIMentorChat;
