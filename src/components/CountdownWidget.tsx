import { useMemo } from "react";
import { Flame } from "lucide-react";

interface CountdownWidgetProps {
  targetDate?: Date;
}

const CountdownWidget = ({ targetDate = new Date("2026-09-14") }: CountdownWidgetProps) => {
  const daysLeft = useMemo(() => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [targetDate]);

  return (
    <div className="gradient-primary rounded-2xl p-6 text-primary-foreground shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">Exam Day Countdown</p>
          <p className="text-5xl font-extrabold mt-1">{daysLeft}</p>
          <p className="text-sm font-medium opacity-80 mt-1">days until 14th September</p>
        </div>
        <div className="text-6xl">🎯</div>
      </div>
    </div>
  );
};

export default CountdownWidget;
