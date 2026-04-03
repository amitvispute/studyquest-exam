import { useState } from "react";
import CountdownWidget from "@/components/CountdownWidget";
import StreakWidget from "@/components/StreakWidget";
import LevelProgress from "@/components/LevelProgress";
import DailyLogForm from "@/components/DailyLogForm";
import RecentScores from "@/components/RecentScores";
import WeeklyReport from "@/components/WeeklyReport";
import AIMentorChat from "@/components/AIMentorChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BarChart3, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Demo data - will be replaced with Supabase
const DEMO_ENTRIES = [
  { date: "2025-07-01", subject: "english", score: 88, questions: 20, minutes: 30 },
  { date: "2025-07-01", subject: "maths", score: 72, questions: 25, minutes: 35 },
  { date: "2025-06-30", subject: "vr", score: 90, questions: 15, minutes: 20 },
  { date: "2025-06-30", subject: "nvr", score: 80, questions: 18, minutes: 25 },
  { date: "2025-06-29", subject: "english", score: 85, questions: 22, minutes: 28 },
  { date: "2025-06-29", subject: "maths", score: 78, questions: 20, minutes: 30 },
];

const WEEKLY_DATA = [
  { subject: "English", totalQuestions: 42, avgScore: 87 },
  { subject: "Maths", totalQuestions: 45, avgScore: 75 },
  { subject: "Verbal Reasoning", totalQuestions: 15, avgScore: 90 },
  { subject: "Non-Verbal Reasoning", totalQuestions: 18, avgScore: 80 },
];

const Index = () => {
  const [entries, setEntries] = useState(DEMO_ENTRIES);

  const handleLogSubmit = (newEntries: { subject: string; minutes: number; questions: number; score: number }[]) => {
    const today = new Date().toISOString().split("T")[0];
    const withDate = newEntries.map((e) => ({ ...e, date: today }));
    setEntries((prev) => [...withDate, ...prev]);
    toast.success("Practice logged! Keep it up! 🎉");
  };

  const totalQuestions = entries.reduce((sum, e) => sum + e.questions, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary px-4 py-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">
            🎓 Pareet's 11+ Prep
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            Grammar School Exam Tracker & AI Mentor
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-3 h-14 bg-muted rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2">
              <BookOpen className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2">
              <BarChart3 className="h-4 w-4" />
              Weekly Report
            </TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2">
              <Sparkles className="h-4 w-4" />
              11+ Mentor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5">
            <CountdownWidget />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StreakWidget streak={5} />
              <LevelProgress totalQuestions={totalQuestions} />
            </div>
            <DailyLogForm onSubmit={handleLogSubmit} />
            <RecentScores entries={entries} />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyReport data={WEEKLY_DATA} />
          </TabsContent>

          <TabsContent value="mentor">
            <AIMentorChat />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
