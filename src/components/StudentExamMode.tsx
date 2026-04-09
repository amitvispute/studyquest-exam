import { useState, useEffect } from "react";
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

const StudentExamMode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch active/upcoming exams for student
  const { data: exams = [] } = useQuery({
    queryKey: ["student_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .eq("student_user_id", user!.id)
        .order("scheduled_start", { ascending: true });
      if (error) throw error;
      return data as Exam[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const now = new Date();
  const activeExam = exams.find(
    (e) => new Date(e.scheduled_start) <= now && new Date(e.scheduled_end) > now && (e.status === "scheduled" || e.status === "in_progress")
  );
  const completedExam = exams.find(
    (e) => e.status === "completed" && new Date(e.scheduled_end) > now
  );
  const upcomingExams = exams.filter(
    (e) => new Date(e.scheduled_start) > now && e.status === "scheduled"
  );
  const expiredExams = exams.filter(
    (e) => e.status === "expired"
  );

  const examToShow = activeExam || completedExam;

  // Fetch questions for active exam
  const { data: questions = [] } = useQuery({
    queryKey: ["exam_questions", examToShow?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_questions")
        .select("*")
        .eq("exam_id", examToShow!.id)
        .order("question_number");
      if (error) throw error;
      return data as Question[];
    },
    enabled: !!examToShow,
  });

  // Fetch existing answers
  const { data: existingAnswers = [] } = useQuery({
    queryKey: ["exam_answers", examToShow?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_answers")
        .select("*")
        .eq("exam_id", examToShow!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!examToShow,
  });

  useEffect(() => {
    if (existingAnswers.length > 0) {
      const map: Record<string, string> = {};
      existingAnswers.forEach((a: any) => { map[a.question_id] = a.student_answer; });
      setAnswers(map);
      if (examToShow?.status === "completed") setShowResults(true);
    }
  }, [existingAnswers, examToShow?.status]);

  // Mark exam as in_progress on first load
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

      // Bug 2: Auto-save scores to mock_exams table
      const subjectScores: Record<string, { correct: number; total: number }> = {};
      questions.forEach((q) => {
        if (!subjectScores[q.subject]) subjectScores[q.subject] = { correct: 0, total: 0 };
        subjectScores[q.subject].total++;
        if (answers[q.id] === q.correct_answer) subjectScores[q.subject].correct++;
      });

      const totalCorrect = Object.values(subjectScores).reduce((s, v) => s + v.correct, 0);
      const totalQs = questions.length;

      const { error: mockSaveError } = await supabase.from("mock_exams").insert({
        user_id: user!.id,
        date: format(new Date(), "yyyy-MM-dd"),
        provider: activeExam.title,
        english_score: subjectScores["english"]?.correct ?? null,
        maths_score: subjectScores["maths"]?.correct ?? null,
        vr_score: subjectScores["vr"]?.correct ?? null,
        nvr_score: subjectScores["nvr"]?.correct ?? null,
        total_score: totalCorrect,
        max_score: totalQs,
        notes: `AI Mock Exam - ${activeExam.subjects.join(", ")}`,
      });

      if (mockSaveError) {
        console.error("Failed to save mock result:", mockSaveError);
        toast.error("Exam submitted but failed to save scores");
      } else {
        toast.success("Results saved successfully! ✅");
        queryClient.invalidateQueries({ queryKey: ["mock_exams"] });
      }

      toast.success("Exam submitted! 🎉");
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["student_exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam_answers", activeExam.id] });
    } catch (e) {
      toast.error("Failed to submit answers");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show results in review mode
  if (showResults && examToShow && questions.length > 0) {
    const canReview = new Date(examToShow.scheduled_end) > now;
    return (
      <MockExamResults
        questions={questions}
        answers={answers}
        examTitle={examToShow.title}
        canReview={canReview}
        onBack={() => setShowResults(false)}
      />
    );
  }

  // No active exam — show upcoming or normal state
  if (!activeExam) {
    return (
      <div className="space-y-4">
        {upcomingExams.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
            <p className="font-semibold text-foreground">📅 Upcoming Mock Exams</p>
            {upcomingExams.map((e) => (
              <p key={e.id} className="text-sm text-muted-foreground mt-1">
                <strong>{e.title}</strong> — {format(new Date(e.scheduled_start), "d MMM, HH:mm")}
              </p>
            ))}
          </div>
        )}
        {completedExam && (
          <Button variant="outline" className="w-full h-12" onClick={() => setShowResults(true)}>
            📊 Review Last Exam Results
          </Button>
        )}
        {expiredExams.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="font-semibold text-foreground mb-2">⏰ Missed Exams</p>
            {expiredExams.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(e.scheduled_start), "d MMM yyyy, HH:mm")}</p>
                </div>
                <Badge variant="destructive" className="text-xs">Not Completed</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Active exam — show questions
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
        {questions.map((q, idx) => (
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
};

export default StudentExamMode;
