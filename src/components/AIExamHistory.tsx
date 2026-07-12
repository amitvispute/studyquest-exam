import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ExamHistoryCard from "@/components/ExamHistoryCard";
import MockExamResults from "@/components/MockExamResults";

interface Exam {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  num_questions: number;
  subjects: string[];
}

// Shared AI mock exam history + scorecard view, used by both parent and student
// so the two roles see exactly the same results experience.
const AIExamHistory = () => {
  const { user, role } = useAuth();
  const isParent = role === "parent";
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const { data: exams = [] } = useQuery({
    queryKey: ["ai_exam_history", role, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("ai_mock_exams")
        .select("*")
        .in("status", ["completed", "expired"])
        .order("scheduled_start", { ascending: false });
      query = isParent ? query.eq("created_by", user!.id) : query.eq("student_user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Exam[];
    },
    enabled: !!user,
  });

  const examIds = exams.map((e) => e.id);

  const { data: examData = {} } = useQuery({
    queryKey: ["ai_exam_history_data", examIds],
    queryFn: async () => {
      if (examIds.length === 0) return {};
      const [{ data: questions }, { data: answers }] = await Promise.all([
        supabase.from("ai_mock_questions").select("*").in("exam_id", examIds),
        supabase.from("ai_mock_answers").select("*").in("exam_id", examIds),
      ]);
      const map: Record<string, { questions: any[]; answers: any[] }> = {};
      examIds.forEach((id) => {
        map[id] = {
          questions: (questions || []).filter((q: any) => q.exam_id === id),
          answers: (answers || []).filter((a: any) => a.exam_id === id),
        };
      });
      return map;
    },
    enabled: examIds.length > 0,
  });

  const examDates = exams.map((e) => new Date(e.scheduled_start));
  const filtered = selectedDate
    ? exams.filter((e) => format(new Date(e.scheduled_start), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"))
    : exams;

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedData = selectedExamId ? examData[selectedExamId] : null;

  if (selectedExam && selectedData) {
    const answerMap: Record<string, string> = {};
    selectedData.answers.forEach((a: any) => {
      answerMap[a.question_id] = a.student_answer;
    });
    return (
      <MockExamResults
        examId={selectedExam.id}
        questions={selectedData.questions}
        answers={answerMap}
        examTitle={selectedExam.title}
        examDate={selectedExam.scheduled_start}
        canReview={true}
        onBack={() => setSelectedExamId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">🤖 AI Mock Exams</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", selectedDate && "text-primary")}>
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, "d MMM yyyy") : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="p-3 pointer-events-auto"
              modifiers={{ hasExam: examDates }}
              modifiersClassNames={{ hasExam: "bg-primary/20 font-bold" }}
            />
            {selectedDate && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedDate(undefined)}>
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p className="text-4xl mb-2">📋</p>
          <p>No AI mock exams yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam) => {
            const data = examData[exam.id];
            const total = data?.questions.length ?? 0;
            const correctAnswers = data?.answers.filter((a: any) => a.is_correct) ?? [];
            const bySubject: Record<string, { correct: number; total: number }> = {};
            (data?.questions || []).forEach((q: any) => {
              if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, total: 0 };
              bySubject[q.subject].total++;
              if (correctAnswers.find((a: any) => a.question_id === q.id)) bySubject[q.subject].correct++;
            });
            return (
              <ExamHistoryCard
                key={exam.id}
                exam={exam}
                scores={bySubject}
                totalScore={{ correct: correctAnswers.length, total }}
                onReview={exam.status === "completed" ? () => setSelectedExamId(exam.id) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIExamHistory;
