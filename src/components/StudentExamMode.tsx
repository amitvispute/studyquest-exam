import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MockExamResults from "@/components/MockExamResults";
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

interface Exam {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  num_questions: number;
  subjects: string[];
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const StudentExamMode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState("");

  const { data: exams = [] } = useQuery({
    queryKey: ["student_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .eq("student_user_id", user!.id)
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return data as Exam[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const now = new Date();

  const activeExam = exams.find(
    (e) =>
      new Date(e.scheduled_start) <= now &&
      new Date(e.scheduled_end) > now &&
      (e.status === "scheduled" || e.status === "in_progress")
  );

  const upcomingExams = exams.filter(
    (e) => new Date(e.scheduled_start) > now && e.status === "scheduled"
  );

  const { data: questions = [] } = useQuery({
    queryKey: ["exam_questions", activeExam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_questions")
        .select("*")
        .eq("exam_id", activeExam!.id)
        .order("question_number");
      if (error) throw error;
      return data as Question[];
    },
    enabled: !!activeExam,
  });

  const { data: existingAnswers = [] } = useQuery({
    queryKey: ["exam_answers", activeExam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_answers")
        .select("*")
        .eq("exam_id", activeExam!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!activeExam,
  });

  useEffect(() => {
    if (existingAnswers.length > 0) {
      const map: Record<string, string> = {};
      existingAnswers.forEach((a: any) => {
        map[a.question_id] = a.student_answer;
      });
      setAnswers(map);
      if (activeExam?.status === "completed") setShowResults(true);
    }
  }, [existingAnswers, activeExam?.status]);

  useEffect(() => {
    if (activeExam && activeExam.status === "scheduled") {
      supabase
        .from("ai_mock_exams")
        .update({ status: "in_progress" })
        .eq("id", activeExam.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["student_exams"] });
        });
    }
  }, [activeExam?.id]);

  // Countdown timer
  useEffect(() => {
    if (!activeExam) return;
    const tick = () => {
      const remaining = new Date(activeExam.scheduled_end).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("Time's up!");
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeExam?.scheduled_end]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!activeExam || questions.length === 0) return;
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const rows = questions.map((q) => ({
        exam_id: activeExam.id,
        question_id: q.id,
        student_answer: answers[q.id],
        is_correct: answers[q.id] === q.correct_answer,
      }));

      const { error } = await supabase.from("ai_mock_answers").insert(rows);
      if (error) throw error;

      await supabase.from("ai_mock_exams").update({ status: "completed" }).eq("id", activeExam.id);

      const subjectScores: Record<string, { correct: number; total: number }> = {};
      questions.forEach((q) => {
        if (!subjectScores[q.subject]) subjectScores[q.subject] = { correct: 0, total: 0 };
        subjectScores[q.subject].total++;
        if (answers[q.id] === q.correct_answer) subjectScores[q.subject].correct++;
      });

      const totalCorrect = Object.values(subjectScores).reduce((s, v) => s + v.correct, 0);

      await supabase.from("mock_exams").insert({
        user_id: user!.id,
        date: format(new Date(), "yyyy-MM-dd"),
        provider: activeExam.title,
        english_score: subjectScores["english"]?.correct ?? null,
        maths_score: subjectScores["maths"]?.correct ?? null,
        vr_score: subjectScores["vr"]?.correct ?? null,
        nvr_score: subjectScores["nvr"]?.correct ?? null,
        total_score: totalCorrect,
        max_score: questions.length,
        notes: `AI Mock Exam - ${activeExam.subjects.join(", ")}`,
      });

      toast.success("Exam submitted! 🎉");
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["student_exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam_answers", activeExam.id] });
      queryClient.invalidateQueries({ queryKey: ["mock_exams"] });
    } catch (e) {
      toast.error("Failed to submit answers");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFlag = useCallback(
    (qid: string) =>
      setFlagged((prev) => {
        const n = new Set(prev);
        n.has(qid) ? n.delete(qid) : n.add(qid);
        return n;
      }),
    []
  );

  // ──── Results view ────
  if (showResults && activeExam && questions.length > 0) {
    return (
      <MockExamResults
        examId={activeExam.id}
        questions={questions}
        answers={answers}
        examTitle={activeExam.title}
        examDate={activeExam.scheduled_start}
        canReview={true}
        onBack={() => {
          setShowResults(false);
          setAnswers({});
          setCurrentIndex(0);
          setFlagged(new Set());
        }}
      />
    );
  }

  // ──── Active exam: one question at a time ────
  if (activeExam && questions.length > 0) {
    const safeIndex = Math.min(currentIndex, questions.length - 1);
    const q = questions[safeIndex];
    const isLast = safeIndex === questions.length - 1;
    const isFirst = safeIndex === 0;
    const isFlagged = flagged.has(q.id);

    return (
      <div className="bg-card rounded-2xl shadow-card border border-border">
        {/* Header: title + timer */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-base">{activeExam.title}</h3>
            <p className="text-xs text-muted-foreground">
              Ends at {format(new Date(activeExam.scheduled_end), "HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              {timeLeft}
            </span>
            <Badge variant="destructive" className="text-[10px]">
              LIVE
            </Badge>
          </div>
        </div>

        {/* Progress pips */}
        <div className="flex gap-[3px] px-4 pt-3 pb-1">
          {questions.map((pq, i) => {
            let pipColor = "bg-border";
            if (i === safeIndex) pipColor = "bg-primary";
            else if (answers[pq.id]) pipColor = flagged.has(pq.id) ? "bg-warning" : "bg-primary/40";
            else if (flagged.has(pq.id)) pipColor = "bg-warning/50";
            return (
              <button
                key={pq.id}
                onClick={() => setCurrentIndex(i)}
                className={`flex-1 h-[5px] rounded-full transition-colors ${pipColor}`}
                title={`Q${i + 1}${answers[pq.id] ? " (answered)" : ""}${flagged.has(pq.id) ? " (flagged)" : ""}`}
              />
            );
          })}
        </div>

        {/* Question */}
        <div className="p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Question {safeIndex + 1} of {questions.length}
          </p>
          <p className="text-lg font-bold text-foreground leading-snug mb-2">{q.question_text}</p>
          <Badge variant="outline" className="text-[10px] capitalize mb-5">
            {q.subject} · {q.topic || "General"}
          </Badge>

          {/* Options */}
          <div className="space-y-2.5">
            {(q.options as string[]).map((opt, oi) => {
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={oi}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {OPTION_LETTERS[oi] || oi + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Flag for review */}
          <button
            onClick={() => toggleFlag(q.id)}
            className="mt-3 text-xs font-semibold text-muted-foreground hover:text-warning transition-colors"
          >
            {isFlagged ? "✓ Flagged for review" : "⚑ Flag for review"}
          </button>
        </div>

        {/* Navigation footer */}
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {answeredCount}/{questions.length} answered
            {flagged.size > 0 && ` · ${flagged.size} flagged`}
          </p>
          <div className="flex gap-2.5">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="h-12"
              >
                ← Back
              </Button>
            )}
            {!isLast ? (
              <Button
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="flex-1 h-12 text-base"
              >
                Next →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className="flex-1 h-12 text-base"
              >
                {isSubmitting ? "Submitting..." : allAnswered ? "Submit Exam ✅" : `${questions.length - answeredCount} unanswered`}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──── No active exam — upcoming list ────
  return (
    <div className="space-y-4">
      {upcomingExams.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
          <p className="font-semibold text-foreground mb-2">📅 Upcoming Mock Exams</p>
          {upcomingExams.map((e) => (
            <p key={e.id} className="text-sm text-muted-foreground mt-1">
              <strong>{e.title}</strong> — {format(new Date(e.scheduled_start), "d MMM, HH:mm")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentExamMode;
