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
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <h3 className="text-lg font-bold text-foreground mb-4">📋 Recent Scores</h3>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No practice logged yet. Start today! 💪
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {SUBJECT_EMOJI[entry.subject] || "📝"}
                </span>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {SUBJECT_LABEL[entry.subject] || entry.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {entry.questions} Qs · {entry.minutes} min
                  </p>
                </div>
              </div>
              <span
                className={`text-lg font-bold ${
                  entry.score >= 85 ? "text-success" : "text-warning"
                }`}
              >
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
