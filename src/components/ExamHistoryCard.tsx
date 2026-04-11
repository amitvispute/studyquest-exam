import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ExamHistoryCardProps {
  exam: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    num_questions: number;
    subjects: string[];
  };
  scores?: Record<string, { correct: number; total: number }>;
  totalScore?: { correct: number; total: number };
  onReview?: () => void;
}

const ExamHistoryCard = ({ exam, scores, totalScore, onReview }: ExamHistoryCardProps) => {
  const isCompleted = exam.status === "completed";
  const pct = totalScore && totalScore.total > 0 ? Math.round((totalScore.correct / totalScore.total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-foreground text-sm flex items-center gap-2">
            {isCompleted ? "✅" : "❌"} {exam.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(exam.scheduled_start), "d MMM yyyy, HH:mm")}
          </p>
        </div>
        <Badge variant={isCompleted ? "default" : "destructive"} className="text-xs">
          {isCompleted ? "Completed" : "Missed"}
        </Badge>
      </div>

      {isCompleted && totalScore && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-primary">
              {totalScore.correct}/{totalScore.total}
            </span>
            <span className="text-sm text-muted-foreground">{pct}%</span>
          </div>
          {scores && Object.keys(scores).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(scores).map(([subj, s]) => (
                <span key={subj} className="text-xs bg-muted px-2 py-1 rounded-md text-foreground capitalize">
                  {subj}: {s.correct}/{s.total}
                </span>
              ))}
            </div>
          )}
          {onReview && (
            <Button variant="outline" size="sm" className="w-full" onClick={onReview}>
              📊 Review Results
            </Button>
          )}
        </>
      )}

      {!isCompleted && (
        <p className="text-xs text-muted-foreground">Not Completed</p>
      )}
    </div>
  );
};

export default ExamHistoryCard;
