interface LevelProgressProps {
  totalQuestions: number;
}

const LEVELS = [
  { name: "Starter", threshold: 0, emoji: "🌱" },
  { name: "Explorer", threshold: 50, emoji: "🧭" },
  { name: "Scholar", threshold: 150, emoji: "📚" },
  { name: "Champion", threshold: 300, emoji: "🏆" },
  { name: "Master", threshold: 500, emoji: "🎓" },
  { name: "Legend", threshold: 1000, emoji: "⭐" },
];

const LevelProgress = ({ totalQuestions }: LevelProgressProps) => {
  const currentLevelIndex = LEVELS.findLastIndex((l) => totalQuestions >= l.threshold);
  const currentLevel = LEVELS[currentLevelIndex] || LEVELS[0];
  const nextLevel = LEVELS[currentLevelIndex + 1];

  const progress = nextLevel
    ? ((totalQuestions - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100
    : 100;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Level</p>
          <p className="text-xl font-bold text-foreground">
            {currentLevel.emoji} {currentLevel.name}
          </p>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          {totalQuestions} questions done
        </p>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-success rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {nextLevel && (
        <p className="text-xs text-muted-foreground mt-2">
          {nextLevel.threshold - totalQuestions} more to reach {nextLevel.emoji} {nextLevel.name}
        </p>
      )}
    </div>
  );
};

export default LevelProgress;
