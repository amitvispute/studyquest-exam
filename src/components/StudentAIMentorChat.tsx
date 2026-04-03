import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import StudentExamMode from "@/components/StudentExamMode";

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
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for active exam
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
    enabled: !!user,
    refetchInterval: 30000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

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

  // If there's an active exam, show exam mode instead
  if (activeExam) {
    return <StudentExamMode />;
  }

  return (
    <div className="space-y-4">
      {/* Upcoming exam banner handled by StudentExamMode */}
      <StudentExamMode />

      <div className="bg-card rounded-2xl shadow-card border border-border flex flex-col h-[550px]">
        <div className="gradient-primary rounded-t-2xl p-5 flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
          <div>
            <h3 className="font-bold text-primary-foreground text-xl">11+ Mentor</h3>
            <p className="text-primary-foreground/70 text-sm">Your AI study buddy</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-5xl mb-3">👋</p>
              <p className="text-foreground font-semibold text-lg">Hi Pareet! What shall we learn today?</p>
              <p className="text-base text-muted-foreground mt-1">Pick a topic or ask me anything!</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                {QUICK_TOPICS.map((topic) => (
                  <Button
                    key={topic.label}
                    variant="outline"
                    size="lg"
                    className="text-left justify-start min-h-[48px] text-base px-4 py-3"
                    onClick={() => sendMessage(topic.prompt)}
                  >
                    <span className="mr-2 text-lg">{topic.emoji}</span>
                    {topic.label}
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
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about 11+..." className="flex-1 h-12 text-base" disabled={isLoading} />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-12 w-12">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentAIMentorChat;
