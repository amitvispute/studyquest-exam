import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StudentExamMode from "@/components/StudentExamMode";
import { toast } from "sonner";

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

  // Bug 3: Credit limit tracking (student only)
  const { data: creditInfo } = useQuery({
    queryKey: ["ai_mentor_credit_info"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Get settings
      const { data: settings } = await supabase
        .from("ai_mentor_settings")
        .select("daily_limit")
        .eq("student_user_id", user!.id)
        .single();

      // Get today's usage
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

  const isExhausted = isStudent && creditInfo && creditInfo.used >= creditInfo.limit;
  const isNearLimit = isStudent && creditInfo && creditInfo.used >= creditInfo.limit * 0.8 && !isExhausted;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const incrementUsage = async () => {
    if (!user || !isStudent) return;
    await supabase.rpc("increment_mentor_usage");
    queryClient.invalidateQueries({ queryKey: ["ai_mentor_credit_info"] });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check credit limit for students
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

      // Increment usage for students
      if (isStudent) {
        await incrementUsage();
        // Show warning at 80%
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

  return (
    <div className="space-y-4">
      {/* Upcoming exam banner handled by StudentExamMode (student only) */}
      {isStudent && <StudentExamMode />}

      {/* Credit exhausted banner */}
      {isExhausted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-center">
          <p className="text-lg mb-1">😴</p>
          <p className="font-semibold text-foreground">Chats used up for today!</p>
          <p className="text-sm text-muted-foreground">Come back tomorrow or ask your parent for more credits.</p>
        </div>
      )}

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
    </div>
  );
};

export default StudentAIMentorChat;
