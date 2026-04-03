import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  subject: string;
}

interface MockExamResultsProps {
  questions: Question[];
  answers: Record<string, string>;
  examTitle: string;
  canReview: boolean;
  onBack: () => void;
}

const MockExamResults = ({ questions, answers, examTitle, canReview, onBack }: MockExamResultsProps) => {
  const results = useMemo(() => {
    let correct = 0;
    const bySubject: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q) => {
      const isCorrect = answers[q.id] === q.correct_answer;
      if (isCorrect) correct++;
      if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, total: 0 };
      bySubject[q.subject].total++;
      if (isCorrect) bySubject[q.subject].correct++;
    });

    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { correct, total: questions.length, pct, bySubject };
  }, [questions, answers]);

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border">
      <div className={`rounded-t-2xl p-5 ${results.pct >= 85 ? "bg-success/10" : "bg-warning/10"}`}>
        <h3 className="font-bold text-foreground text-xl">📊 {examTitle} — Results</h3>
        <div className="flex items-center gap-4 mt-3">
          <p className={`text-4xl font-extrabold ${results.pct >= 85 ? "text-success" : "text-warning"}`}>{results.pct}%</p>
          <div>
            <p className="text-sm text-muted-foreground">{results.correct}/{results.total} correct</p>
            {!canReview && <p className="text-xs text-muted-foreground">Review period has ended</p>}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Subject breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(results.bySubject).map(([subject, data]) => {
            const pct = Math.round((data.correct / data.total) * 100);
            return (
              <div key={subject} className={`rounded-xl p-3 border ${pct >= 85 ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"}`}>
                <p className="text-xs text-muted-foreground capitalize">{subject}</p>
                <p className={`text-xl font-bold ${pct >= 85 ? "text-success" : "text-warning"}`}>{pct}%</p>
                <p className="text-xs text-muted-foreground">{data.correct}/{data.total}</p>
              </div>
            );
          })}
        </div>

        {/* Question Review */}
        {canReview && (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            <h4 className="font-semibold text-foreground text-sm">📝 Answer Review</h4>
            {questions.map((q) => {
              const studentAns = answers[q.id];
              const isCorrect = studentAns === q.correct_answer;
              return (
                <div key={q.id} className={`rounded-xl p-3 border ${isCorrect ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                  <p className="text-sm text-foreground font-medium">Q{q.question_number}. {q.question_text}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs">
                      Your answer: <span className={isCorrect ? "text-success font-semibold" : "text-destructive font-semibold"}>{studentAns || "—"}</span>
                    </p>
                    {!isCorrect && (
                      <p className="text-xs">Correct: <span className="text-success font-semibold">{q.correct_answer}</span></p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" onClick={onBack} className="w-full h-12">← Back</Button>
      </div>
    </div>
  );
};

export default MockExamResults;
