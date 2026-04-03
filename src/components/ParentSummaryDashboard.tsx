import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DailyLog } from "@/hooks/useDailyLogs";

interface ParentSummaryDashboardProps {
  logs: DailyLog[];
  streak: number;
  totalQuestions: number;
}


const ParentSummaryDashboard = ({ logs, streak, totalQuestions }: ParentSummaryDashboardProps) => {
  const weeklyStats = useMemo(() => {
    const cutoff = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const recent = logs.filter((l) => l.date >= cutoff);
    const totalQ = recent.reduce((s, l) => s + l.questions, 0);
    const avgScore = recent.length > 0 ? Math.round(recent.reduce((s, l) => s + l.score, 0) / recent.length) : 0;
    return { totalQ, avgScore, count: recent.length };
  }, [logs]);

  const dailyChart = useMemo(() => {
    const days: Record<string, { questions: number; avgScore: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[d] = { questions: 0, avgScore: 0, count: 0 };
    }
    const cutoff = format(subDays(new Date(), 7), "yyyy-MM-dd");
    logs.filter((l) => l.date >= cutoff).forEach((l) => {
      if (days[l.date]) {
        days[l.date].questions += l.questions;
        days[l.date].avgScore += l.score;
        days[l.date].count++;
      }
    });
    return Object.entries(days).map(([date, d]) => ({
      day: format(new Date(date), "EEE"),
      questions: d.questions,
      avgScore: d.count > 0 ? Math.round(d.avgScore / d.count) : 0,
    }));
  }, [logs]);


  

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <p className="text-xs text-muted-foreground">7-Day Questions</p>
          <p className="text-3xl font-extrabold text-foreground">{weeklyStats.totalQ}</p>
        </div>
        <div className={`rounded-2xl p-4 shadow-card border text-center ${weeklyStats.avgScore >= 85 ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"}`}>
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-3xl font-extrabold ${weeklyStats.avgScore >= 85 ? "text-success" : "text-warning"}`}>{weeklyStats.avgScore}%</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="text-3xl font-extrabold text-foreground">🔥 {streak}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <p className="text-xs text-muted-foreground">All-Time Qs</p>
          <p className="text-3xl font-extrabold text-foreground">{totalQuestions}</p>
        </div>
      </div>


      {/* Daily Activity Chart */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h3 className="text-base font-bold text-foreground mb-3">📊 Daily Activity (7 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,25%,88%)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(214,25%,88%)" }} />
            <Line type="monotone" dataKey="questions" stroke="hsl(var(--primary))" strokeWidth={2} name="Questions" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default ParentSummaryDashboard;
