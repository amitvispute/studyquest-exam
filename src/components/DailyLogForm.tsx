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
  { key: "vr", label: "VR", emoji: "🧩" },
  { key: "nvr", label: "NVR", emoji: "🔷" },
];

const DailyLogForm = ({ onSubmit, isSubmitting }: DailyLogFormProps) => {
  const [entries, setEntries] = useState<Record<string, { minutes: string; questions: string; score: string }>>(
    Object.fromEntries(SUBJECTS.map((s) => [s.key, { minutes: "", questions: "", score: "" }]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);

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
      setExpanded(null);
    }
  };

  const hasAnyEntry = SUBJECTS.some((s) => entries[s.key].questions !== "");

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
      <h3 className="text-lg font-bold text-foreground mb-4">📝 Today's Practice</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SUBJECTS.map((subject) => {
          const isExpanded = expanded === subject.key;
          const hasData = entries[subject.key].questions !== "";
          return (
            <div key={subject.key} className="flex flex-col">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : subject.key)}
                className={`rounded-xl p-4 text-center transition-all min-h-[72px] flex flex-col items-center justify-center gap-1 border ${
                  isExpanded
                    ? "bg-primary/10 border-primary shadow-md"
                    : hasData
                    ? "bg-success/10 border-success/40"
                    : "bg-muted/50 border-border hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{subject.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{subject.label}</span>
                {hasData && <span className="text-xs text-success font-medium">✓ logged</span>}
              </button>
            </div>
          );
        })}
      </div>

      {expanded && (
        <div className="mt-4 bg-muted/50 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
          <p className="font-semibold text-foreground mb-3">
            {SUBJECTS.find((s) => s.key === expanded)?.emoji}{" "}
            {SUBJECTS.find((s) => s.key === expanded)?.label}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Minutes</Label>
              <Input type="number" placeholder="0" className="mt-1 h-12 text-base" value={entries[expanded].minutes} onChange={(e) => updateEntry(expanded, "minutes", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Questions</Label>
              <Input type="number" placeholder="0" className="mt-1 h-12 text-base" value={entries[expanded].questions} onChange={(e) => updateEntry(expanded, "questions", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Score %</Label>
              <Input type="number" placeholder="0" min="0" max="100" className="mt-1 h-12 text-base" value={entries[expanded].score} onChange={(e) => updateEntry(expanded, "score", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {hasAnyEntry && (
        <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full mt-4 h-12 text-base">
          {isSubmitting ? "Saving..." : "Save Today's Progress ✅"}
        </Button>
      )}
    </div>
  );
};

export default DailyLogForm;
