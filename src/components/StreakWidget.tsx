import { Flame } from "lucide-react";

interface StreakWidgetProps {
  streak: number;
}

const StreakWidget = ({ streak }: StreakWidgetProps) => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
      <div className="flex items-center gap-3">
        <div className="text-4xl animate-flame">🔥</div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Daily Streak</p>
          <p className="text-3xl font-extrabold text-foreground">{streak} days</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < streak % 7 ? "gradient-streak" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default StreakWidget;
