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

const SUBJECT_EMOJI: Record<string, string> = {
  english: "📖",
  maths: "🔢",
  vr: "🧩",
  nvr: "🔷",
};

const SUBJECT_LABEL: Record<string, string> = {
  english: "English",
  maths: "Maths",
  vr: "VR",
  nvr: "NVR",
};

const RecentScores = ({ entries }: RecentScoresProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = dateStr === todayStr;

  const filtered = entries.filter((e) => e.date === dateStr);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">📋 {isToday ? "Today's" : format(selectedDate, "d MMM")} Scores</h3>
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

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          {isToday ? "No practice logged yet today. Start now! 💪" : "No scores for this date."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-xl">{SUBJECT_EMOJI[entry.subject] || "📝"}</span>
                <div>
                  <p className="font-medium text-foreground text-sm">{SUBJECT_LABEL[entry.subject] || entry.subject}</p>
                  <p className="text-xs text-muted-foreground">{entry.questions} Qs · {entry.minutes} min</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${entry.score >= 85 ? "text-success" : "text-warning"}`}>
                {entry.score}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentScores;
