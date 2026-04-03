import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DailyLogEntry {
  subject: string;
  minutes: number;
  questions: number;
  score: number;
}

interface DailyLogFormProps {
  onSubmit: (entries: DailyLogEntry[]) => void;
  isSubmitting?: boolean;
}

const SUBJECTS = [
  { key: "english", label: "English", emoji: "📖" },
  { key: "maths", label: "Maths", emoji: "🔢" },
  { key: "vr", label: "Verbal Reasoning", emoji: "🧩" },
  { key: "nvr", label: "Non-Verbal Reasoning", emoji: "🔷" },
];

const DailyLogForm = ({ onSubmit, isSubmitting }: DailyLogFormProps) => {
  const [entries, setEntries] = useState<Record<string, { minutes: string; questions: string; score: string }>>(
    Object.fromEntries(SUBJECTS.map((s) => [s.key, { minutes: "", questions: "", score: "" }]))
  );

  const updateEntry = (subject: string, field: string, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [subject]: { ...prev[subject], [field]: value },
    }));
  };

  const handleSubmit = () => {
    const parsed: DailyLogEntry[] = SUBJECTS
      .filter((s) => entries[s.key].questions !== "")
      .map((s) => ({
        subject: s.key,
        minutes: parseInt(entries[s.key].minutes) || 0,
        questions: parseInt(entries[s.key].questions) || 0,
        score: parseInt(entries[s.key].score) || 0,
      }));
    if (parsed.length > 0) {
      onSubmit(parsed);
      setEntries(Object.fromEntries(SUBJECTS.map((s) => [s.key, { minutes: "", questions: "", score: "" }])));
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <h3 className="text-lg font-bold text-foreground mb-4">📝 Today's Practice Log</h3>
      <div className="space-y-4">
        {SUBJECTS.map((subject) => (
          <div key={subject.key} className="bg-muted/50 rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">{subject.emoji} {subject.label}</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Minutes</Label>
                <Input type="number" placeholder="0" className="mt-1 h-11 text-base" value={entries[subject.key].minutes} onChange={(e) => updateEntry(subject.key, "minutes", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Questions</Label>
                <Input type="number" placeholder="0" className="mt-1 h-11 text-base" value={entries[subject.key].questions} onChange={(e) => updateEntry(subject.key, "questions", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Score %</Label>
                <Input type="number" placeholder="0" min="0" max="100" className="mt-1 h-11 text-base" value={entries[subject.key].score} onChange={(e) => updateEntry(subject.key, "score", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full mt-4">
        {isSubmitting ? "Saving..." : "Save Today's Progress ✅"}
      </Button>
    </div>
  );
};

export default DailyLogForm;
