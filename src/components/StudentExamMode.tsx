import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MockExamResults from "@/components/MockExamResults";
import ExamHistoryCard from "@/components/ExamHistoryCard";
import { format, subDays, isSameDay, parseISO } from "date-fns";

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

const StudentExamMode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [reviewExamId, setReviewExamId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch all exams for student
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

  // Fetch all answers for score breakdowns
  const completedExamIds = exams.filter(e => e.status === "completed").map(e => e.id);
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

  // Fetch questions for completed exams (for subject breakdown)
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

  // Build score maps per exam
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

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);

  const activeExam = exams.find(
    (e) => new Date(e.scheduled_start) <= now && new Date(e.scheduled_end) > now && (e.status === "scheduled" || e.status === "in_progress")
  );

  const upcomingExams = exams.filter(
    (e) => new Date(e.scheduled_start) > now && e.status === "scheduled"
  );

  const recentHistory = exams.filter(
    (e) => (e.status === "completed" || e.status === "expired") && new Date(e.scheduled_start) >= sevenDaysAgo
  );

  const allHistory = exams.filter(
    (e) => e.status === "completed" || e.status === "expired"
  );

  // Calendar modifiers
  const completedDates = allHistory.filter(e => e.status === "completed").map(e => new Date(e.scheduled_start));
  const missedDates = allHistory.filter(e => e.status === "expired").map(e => new Date(e.scheduled_start));

  const selectedDateExams = selectedDate
    ? allHistory.filter(e => isSameDay(new Date(e.scheduled_start), selectedDate))
    : [];

  // For active exam: fetch questions & existing answers
  const examForQuestions = reviewExamId
    ? exams.find(e => e.id === reviewExamId)
    : activeExam;

  const { data: questions = [] } = useQuery({
    queryKey: ["exam_questions", examForQuestions?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_questions")
        .select("*")
        .eq("exam_id", examForQuestions!.id)
        .order("question_number");
      if (error) throw error;
      return data as Question[];
    },
    enabled: !!examForQuestions,
  });

  const { data: existingAnswers = [] } = useQuery({
    queryKey: ["exam_answers", examForQuestions?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_answers")
        .select("*")
        .eq("exam_id", examForQuestions!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!examForQuestions,
  });

  useEffect(() => {
    if (existingAnswers.length > 0) {
      const map: Record<string, string> = {};
      existingAnswers.forEach((a: any) => { map[a.question_id] = a.student_answer; });
      setAnswers(map);
      if (examForQuestions?.status === "completed") setShowResults(true);
    }
  }, [existingAnswers, examForQuestions?.status]);

  useEffect(() => {
    if (activeExam && activeExam.status === "scheduled") {
      supabase.from("ai_mock_exams").update({ status: "in_progress" }).eq("id", activeExam.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["student_exams"] });
      });
    }
  }, [activeExam?.id]);

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

  const handleReviewExam = (examId: string) => {
    setReviewExamId(examId);
    setShowResults(true);
  };

  // Show results in review mode
  if (showResults && examForQuestions && questions.length > 0) {
    return (
      <MockExamResults
        questions={questions}
        answers={answers}
        examTitle={examForQuestions.title}
        canReview={true}
        onBack={() => { setShowResults(false); setReviewExamId(null); setAnswers({}); }}
      />
    );
  }

  // Active exam — show questions
  if (activeExam) {
    const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);
    return (
      <div className="bg-card rounded-2xl shadow-card border border-border">
        <div className="bg-destructive/10 border-b border-destructive/30 rounded-t-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-lg">📝 {activeExam.title}</h3>
              <p className="text-sm text-muted-foreground">Mock Exam in Progress</p>
            </div>
            <Badge variant="destructive">LIVE</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ends at {format(new Date(activeExam.scheduled_end), "HH:mm")} · {questions.length} questions
          </p>
        </div>
        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {questions.map((q) => (
            <div key={q.id} className="bg-muted/50 rounded-xl p-4">
              <p className="font-medium text-foreground text-sm mb-3">
                <span className="text-primary font-bold">Q{q.question_number}.</span> {q.question_text}
              </p>
              <Badge variant="outline" className="mb-3 text-xs">{q.subject}</Badge>
              <div className="space-y-2">
                {(q.options as string[]).map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                      answers[q.id] === opt ? "bg-primary/10 border-primary" : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-foreground">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 text-center">
            {Object.keys(answers).length}/{questions.length} answered
          </p>
          <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting} className="w-full h-12 text-base">
            {isSubmitting ? "Submitting..." : "Submit All Answers ✅"}
          </Button>
        </div>
      </div>
    );
  }

  // No active exam — show 3-section layout
  return (
    <div className="space-y-6">
      {/* Section 1: Upcoming */}
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

      {/* Section 2: Recent History (last 7 days) */}
      {recentHistory.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">📊 Recent Exam History</h3>
          <div className="space-y-3">
            {recentHistory.map((e) => (
              <ExamHistoryCard
                key={e.id}
                exam={e}
                scores={examScores[e.id]?.scores}
                totalScore={examScores[e.id]?.total}
                onReview={e.status === "completed" ? () => handleReviewExam(e.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Calendar History */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">📆 Exam History Calendar</h3>
        <div className="bg-card border border-border rounded-2xl p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="pointer-events-auto mx-auto"
            modifiers={{
              completed: completedDates,
              missed: missedDates,
            }}
            modifiersStyles={{
              completed: { backgroundColor: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))", fontWeight: "bold" },
              missed: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))", fontWeight: "bold" },
            }}
          />

          {selectedDate && selectedDateExams.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {format(selectedDate, "d MMM yyyy")}
              </p>
              {selectedDateExams.map((e) => (
                <ExamHistoryCard
                  key={e.id}
                  exam={e}
                  scores={examScores[e.id]?.scores}
                  totalScore={examScores[e.id]?.total}
                  onReview={e.status === "completed" ? () => handleReviewExam(e.id) : undefined}
                />
              ))}
            </div>
          )}

          {selectedDate && selectedDateExams.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground text-center">No exams on this date</p>
          )}
        </div>
      </div>

      {recentHistory.length === 0 && upcomingExams.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No mock exams yet</p>
      )}
    </div>
  );
};

export default StudentExamMode;
