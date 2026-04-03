import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ScoreEntry {
  date: string;
  subject: string;
  score: number;
  questions: number;
  minutes: number;
}

interface RecentScoresProps {
  entries: ScoreEntry[];
}

const SUBJECTS = [
  { key: "english", emoji: "📖", label: "English" },
  { key: "maths", emoji: "🔢", label: "Maths" },
  { key: "vr", emoji: "🧩", label: "VR" },
  { key: "nvr", emoji: "🔷", label: "NVR" },
];

const RecentScores = ({ entries }: RecentScoresProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = dateStr === todayStr;

  const filtered = entries.filter((e) => e.date === dateStr);

  // Aggregate by subject: average score, sum questions & minutes
  const bySubject = SUBJECTS.map((sub) => {
    const subEntries = filtered.filter((e) => e.subject === sub.key);
    if (subEntries.length === 0) return { ...sub, score: null, questions: 0, minutes: 0 };
    const avgScore = Math.round(subEntries.reduce((s, e) => s + e.score, 0) / subEntries.length);
    const totalQs = subEntries.reduce((s, e) => s + e.questions, 0);
    const totalMin = subEntries.reduce((s, e) => s + e.minutes, 0);
    return { ...sub, score: avgScore, questions: totalQs, minutes: totalMin };
  });

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">
          📋 {isToday ? "Today's" : format(selectedDate, "d MMM")} Scores
        </h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4" />
              {isToday ? "Today" : format(selectedDate, "d MMM")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bySubject.map((sub) => {
          const hasData = sub.score !== null;
          const isGood = hasData && sub.score! >= 85;
          return (
            <div
              key={sub.key}
              className={cn(
                "rounded-xl p-4 text-center border-2 transition-colors",
                hasData
                  ? isGood
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-amber-500/50 bg-amber-500/10"
                  : "border-border bg-muted/30"
              )}
            >
              <span className="text-2xl">{sub.emoji}</span>
              <p className="text-sm font-medium text-foreground mt-1">{sub.label}</p>
              <p
                className={cn(
                  "text-2xl font-bold mt-2",
                  hasData
                    ? isGood
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {hasData ? `${sub.score}%` : "--"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasData ? `${sub.questions} Qs · ${sub.minutes} min` : "No data"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentScores;
