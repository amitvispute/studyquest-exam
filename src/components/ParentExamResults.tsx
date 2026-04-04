import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ParentExamResults = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const { data: exams = [] } = useQuery({
    queryKey: ["parent_completed_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .eq("created_by", user!.id)
        .eq("status", "completed")
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch answers + questions for all completed exams
  const examIds = exams.map((e: any) => e.id);
  const { data: questionsMap = {} } = useQuery({
    queryKey: ["parent_exam_questions", examIds],
    queryFn: async () => {
      if (examIds.length === 0) return {};
      const { data: questions } = await supabase
        .from("ai_mock_questions")
        .select("*")
        .in("exam_id", examIds);
      const { data: answers } = await supabase
        .from("ai_mock_answers")
        .select("*")
        .in("exam_id", examIds);

      const map: Record<string, { total: number; correct: number; bySubject: Record<string, { total: number; correct: number }> }> = {};
      for (const examId of examIds) {
        const eq = (questions || []).filter((q: any) => q.exam_id === examId);
        const ea = (answers || []).filter((a: any) => a.exam_id === examId);
        const bySubject: Record<string, { total: number; correct: number }> = {};
        eq.forEach((q: any) => {
          if (!bySubject[q.subject]) bySubject[q.subject] = { total: 0, correct: 0 };
          bySubject[q.subject].total++;
          const ans = ea.find((a: any) => a.question_id === q.id);
          if (ans?.is_correct) bySubject[q.subject].correct++;
        });
        map[examId] = {
          total: eq.length,
          correct: ea.filter((a: any) => a.is_correct).length,
          bySubject,
        };
      }
      return map;
    },
    enabled: examIds.length > 0,
  });

  const examDates = exams.map((e: any) => format(new Date(e.scheduled_start), "yyyy-MM-dd"));

  const filtered = selectedDate
    ? exams.filter((e: any) => format(new Date(e.scheduled_start), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"))
    : exams;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">📊 Exam Results</h3>
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
              modifiers={{ hasExam: exams.map((e: any) => new Date(e.scheduled_start)) }}
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
          <p>No completed exams yet</p>
        </div>
      ) : (
        filtered.map((exam: any) => {
          const stats = questionsMap[exam.id];
          return (
            <Card key={exam.id} className="shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(exam.scheduled_start), "d MMM yyyy, HH:mm")}
                    </p>
                  </div>
                  {stats && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {stats.correct}/{stats.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((stats.correct / stats.total) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
                {stats && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.bySubject).map(([subject, s]) => (
                      <Badge key={subject} variant="secondary" className="text-xs">
                        {subject}: {(s as any).correct}/{(s as any).total}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ParentExamResults;
