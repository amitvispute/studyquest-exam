import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  subject: string;
  topic: string;
}

interface MockExamResultsProps {
  examId?: string;
  questions: Question[];
  answers: Record<string, string>;
  examTitle: string;
  examDate?: string;
  canReview: boolean;
  onBack: () => void;
}

type RagLevel = "strong" | "developing" | "focus";

function getRag(pct: number): RagLevel {
  if (pct >= 80) return "strong";
  if (pct >= 60) return "developing";
  return "focus";
}

const RAG_STYLES: Record<RagLevel, { label: string; text: string; bg: string; bar: string }> = {
  strong: { label: "Strong", text: "text-success", bg: "bg-success/10", bar: "hsl(var(--success))" },
  developing: { label: "Developing", text: "text-warning", bg: "bg-warning/10", bar: "hsl(var(--warning))" },
  focus: { label: "Focus area", text: "text-destructive", bg: "bg-destructive/10", bar: "hsl(var(--destructive))" },
};

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

const MockExamResults = ({
  examId,
  questions,
  answers,
  examTitle,
  examDate,
  canReview,
  onBack,
}: MockExamResultsProps) => {
  const { user } = useAuth();
  const [view, setView] = useState<"scorecard" | "review">("scorecard");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState("wrong");

  const results = useMemo(() => {
    let correct = 0;
    const bySubject: Record<
      string,
      {
        correct: number;
        total: number;
        pct: number;
        rag: RagLevel;
        topics: Record<string, { correct: number; total: number; pct: number; rag: RagLevel }>;
      }
    > = {};

    questions.forEach((q) => {
      const hit = answers[q.id] === q.correct_answer;
      if (hit) correct++;

      if (!bySubject[q.subject])
        bySubject[q.subject] = { correct: 0, total: 0, pct: 0, rag: "focus", topics: {} };
      bySubject[q.subject].total++;
      if (hit) bySubject[q.subject].correct++;

      const topic = q.topic || "General";
      if (!bySubject[q.subject].topics[topic])
        bySubject[q.subject].topics[topic] = { correct: 0, total: 0, pct: 0, rag: "focus" };
      bySubject[q.subject].topics[topic].total++;
      if (hit) bySubject[q.subject].topics[topic].correct++;
    });

    Object.values(bySubject).forEach((s) => {
      s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      s.rag = getRag(s.pct);
      Object.values(s.topics).forEach((t) => {
        t.pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
        t.rag = getRag(t.pct);
      });
    });

    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    const allTopics: { name: string; subject: string; pct: number }[] = [];
    Object.entries(bySubject).forEach(([subj, d]) => {
      Object.entries(d.topics).forEach(([t, td]) => {
        allTopics.push({ name: t, subject: subj, pct: td.pct });
      });
    });

    const byBest = [...allTopics].sort((a, b) => b.pct - a.pct);
    const byWorst = [...allTopics].sort((a, b) => a.pct - b.pct);
    const strengths = byBest.filter((t) => t.pct >= 60).slice(0, 2);
    const focusAreas = byWorst.filter((t) => t.pct < 100).slice(0, 2);

    const wrongQuestions = questions.filter((q) => answers[q.id] !== q.correct_answer);

    return { correct, total: questions.length, pct, bySubject, strengths, focusAreas, wrongQuestions };
  }, [questions, answers]);

  // Trend: fetch the most recent previous exam to compare per-subject scores
  const { data: trendData } = useQuery({
    queryKey: ["exam_trend", examId],
    queryFn: async () => {
      if (!user || !examId) return null;
      const { data: prev } = await supabase
        .from("ai_mock_exams")
        .select("id")
        .eq("student_user_id", user.id)
        .eq("status", "completed")
        .neq("id", examId)
        .order("scheduled_start", { ascending: false })
        .limit(1);
      if (!prev || prev.length === 0) return null;

      const pid = prev[0].id;
      const [{ data: pq }, { data: pa }] = await Promise.all([
        supabase.from("ai_mock_questions").select("id, subject").eq("exam_id", pid),
        supabase.from("ai_mock_answers").select("question_id, is_correct").eq("exam_id", pid),
      ]);
      if (!pq || !pa) return null;

      const bs: Record<string, { c: number; t: number }> = {};
      pq.forEach((q: any) => {
        if (!bs[q.subject]) bs[q.subject] = { c: 0, t: 0 };
        bs[q.subject].t++;
        if (pa.find((a: any) => a.question_id === q.id)?.is_correct) bs[q.subject].c++;
      });
      const out: Record<string, number> = {};
      Object.entries(bs).forEach(([s, d]) => {
        out[s] = d.t > 0 ? Math.round((d.c / d.t) * 100) : 0;
      });
      return out;
    },
    enabled: !!user && !!examId,
  });

  const wrongBySubject = useMemo(() => {
    const m: Record<string, number> = {};
    results.wrongQuestions.forEach((q) => (m[q.subject] = (m[q.subject] || 0) + 1));
    return m;
  }, [results.wrongQuestions]);

  const filteredQuestions = useMemo(() => {
    if (reviewFilter === "all") return questions;
    if (reviewFilter === "wrong") return results.wrongQuestions;
    return results.wrongQuestions.filter((q) => q.subject === reviewFilter);
  }, [reviewFilter, questions, results.wrongQuestions]);

  const toggleSubject = (s: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });

  const encouragement = useMemo(() => {
    if (results.pct >= 85) return "Amazing work! You really nailed this one!";
    if (results.pct >= 70) return "Great effort — solid progress!";
    if (results.pct >= 50) return "Good try! Let's review and keep improving!";
    return "Every exam helps you learn. Let's see what to work on!";
  }, [results.pct]);

  const dashOffset = RING_C * (1 - results.pct / 100);

  // ── Filter tab helper ──
  const Tab = ({
    id,
    label,
    count,
    countColor,
  }: {
    id: string;
    label: string;
    count?: number;
    countColor?: string;
  }) => (
    <button
      onClick={() => setReviewFilter(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap capitalize ${
        reviewFilter === id
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1 ${
            reviewFilter === id
              ? "bg-primary-foreground/20 text-primary-foreground"
              : countColor || "bg-primary/10 text-primary"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  // ════════ REVIEW VIEW ════════
  if (view === "review") {
    return (
      <div className="bg-card rounded-2xl shadow-card border border-border">
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-lg">Review your answers</h3>
              <p className="text-sm text-muted-foreground">
                {results.wrongQuestions.length} wrong out of {results.total} — let's learn from them
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("scorecard")}>
              ← Scorecard
            </Button>
          </div>
        </div>

        <div className="flex gap-2 p-4 overflow-x-auto">
          <Tab id="wrong" label="Wrong only" count={results.wrongQuestions.length} countColor="bg-destructive/10 text-destructive" />
          <Tab id="all" label="All" count={results.total} />
          {Object.entries(wrongBySubject).map(([subj, cnt]) => (
            <Tab key={subj} id={subj} label={subj} count={cnt} countColor="bg-destructive/10 text-destructive" />
          ))}
        </div>

        <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {filteredQuestions.map((q) => {
            const studentAns = answers[q.id];
            const isCorrect = studentAns === q.correct_answer;
            return (
              <div key={q.id} className="rounded-xl border border-border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Q{q.question_number}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {q.subject} · {q.topic || "General"}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-relaxed mb-3">{q.question_text}</p>
                  <div className="space-y-1.5">
                    {(q.options as string[]).map((opt, oi) => {
                      const isStu = opt === studentAns;
                      const isCor = opt === q.correct_answer;
                      let cls = "bg-muted/30 text-muted-foreground";
                      let mark = "·";
                      let tag = "";
                      if (isCor) {
                        cls = "bg-success/10 text-success font-semibold";
                        mark = "✓";
                        tag = "correct";
                      }
                      if (isStu && !isCorrect) {
                        cls = "bg-destructive/10 text-destructive font-semibold";
                        mark = "✗";
                        tag = "your answer";
                      }
                      if (isStu && isCorrect) {
                        cls = "bg-success/10 text-success font-semibold";
                        mark = "✓";
                        tag = "your answer";
                      }
                      return (
                        <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${cls}`}>
                          <span className="font-bold w-5 text-center flex-shrink-0">{mark}</span>
                          <span className="flex-1">{opt}</span>
                          {tag && <span className="text-[10px] opacity-70 flex-shrink-0">{tag}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!isCorrect && (
                  <div className="bg-warning/5 border-t border-border p-4">
                    <p className="text-[10px] font-bold text-warning uppercase tracking-wide mb-1.5">
                      Think about it
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Read the question one more time. What was it really asking? Look at the
                      correct answer — can you see why it's right and your answer wasn't quite
                      right?
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="w-full h-12">
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ════════ SCORECARD VIEW ════════
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border">
      {/* Hero / score ring */}
      <div className="text-center p-6 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Exam Complete
        </p>
        <h3 className="font-bold text-foreground text-lg">{examTitle}</h3>
        {examDate && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(examDate), "d MMMM yyyy")}
          </p>
        )}

        <div className="relative w-32 h-32 mx-auto mt-4 mb-3">
          <svg viewBox="0 0 130 130" className="w-32 h-32" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="65" cy="65" r={RING_R} fill="none" stroke="hsl(var(--border))" strokeWidth={10} />
            <circle
              cx="65"
              cy="65"
              r={RING_R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-foreground">{results.pct}%</span>
            <span className="text-xs text-muted-foreground font-medium">
              {results.correct} / {results.total}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">{encouragement}</p>
      </div>

      {/* Subject + topic breakdown */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Subject breakdown
        </p>
      </div>

      <div className="px-4 pb-2">
        {Object.entries(results.bySubject).map(([subject, data]) => {
          const rag = RAG_STYLES[data.rag];
          const isOpen = expanded.has(subject);
          const topicEntries = Object.entries(data.topics);
          return (
            <div key={subject}>
              <button
                onClick={() => toggleSubject(subject)}
                className="w-full grid grid-cols-[1fr_50px_44px_52px_auto] gap-2 items-center px-2 py-2.5 border-b border-border text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-semibold text-foreground capitalize">
                  <span className="text-[10px] text-muted-foreground mr-1">{isOpen ? "▾" : "▸"}</span>
                  {subject}
                </span>
                <span className="text-xs text-center text-muted-foreground">
                  {data.correct}/{data.total}
                </span>
                <span className={`text-xs text-center font-bold ${rag.text}`}>{data.pct}%</span>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${data.pct}%`, background: rag.bar }}
                  />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rag.bg} ${rag.text}`}>
                  {rag.label}
                </span>
              </button>
              {isOpen &&
                topicEntries.map(([topic, td]) => {
                  const tr = RAG_STYLES[td.rag];
                  return (
                    <div
                      key={topic}
                      className="grid grid-cols-[1fr_50px_44px_52px_auto] gap-2 items-center px-2 pl-7 py-2 border-b border-border bg-muted/20 text-xs"
                    >
                      <span className="text-muted-foreground font-medium">{topic}</span>
                      <span className="text-center text-muted-foreground">
                        {td.correct}/{td.total}
                      </span>
                      <span className={`text-center font-bold ${tr.text}`}>{td.pct}%</span>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${td.pct}%`, background: tr.bar }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tr.bg} ${tr.text}`}>
                        {tr.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Strengths & focus areas */}
      {(results.strengths.length > 0 || results.focusAreas.length > 0) && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Insights
          </p>
          <div className="grid grid-cols-2 gap-3">
            {results.strengths.length > 0 && (
              <div className="bg-success/10 rounded-xl p-3">
                <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-1">
                  Strengths
                </p>
                {results.strengths.map((t) => (
                  <p key={t.name} className="text-xs text-foreground font-medium">
                    ✓ {t.name}
                  </p>
                ))}
              </div>
            )}
            {results.focusAreas.length > 0 && (
              <div className="bg-destructive/10 rounded-xl p-3">
                <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-1">
                  Focus areas
                </p>
                {results.focusAreas.map((t) => (
                  <p key={t.name} className="text-xs text-foreground font-medium">
                    → {t.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend vs last exam */}
      {trendData && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Trend vs last exam
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(results.bySubject).map(([subject, data]) => {
              const prev = trendData[subject];
              let arrow = "→";
              let arrowCls = "text-muted-foreground";
              if (prev !== undefined) {
                if (data.pct > prev) {
                  arrow = "↑";
                  arrowCls = "text-success";
                } else if (data.pct < prev) {
                  arrow = "↓";
                  arrowCls = "text-destructive";
                }
              }
              return (
                <div
                  key={subject}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-lg text-xs font-semibold text-foreground whitespace-nowrap capitalize"
                >
                  {subject} <span className={`font-extrabold ${arrowCls}`}>{arrow}</span> {data.pct}%
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 border-t border-border space-y-2">
        {canReview && results.wrongQuestions.length > 0 && (
          <Button onClick={() => setView("review")} className="w-full h-12 text-base">
            Review my answers →
          </Button>
        )}
        <Button variant="outline" onClick={onBack} className="w-full h-12">
          ← Back
        </Button>
      </div>
    </div>
  );
};

export default MockExamResults;
