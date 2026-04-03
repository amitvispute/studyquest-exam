import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import CountdownWidget from "@/components/CountdownWidget";
import StreakWidget from "@/components/StreakWidget";
import LevelProgress from "@/components/LevelProgress";
import DailyLogForm from "@/components/DailyLogForm";
import RecentScores from "@/components/RecentScores";
import WeeklyReport from "@/components/WeeklyReport";
import AIMentorChat from "@/components/AIMentorChat";
import MockExamTracker from "@/components/MockExamTracker";
import ClassSchedule from "@/components/ClassSchedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BarChart3, Sparkles, ClipboardCheck, GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { displayName, role, signOut } = useAuth();
  const [entries, setEntries] = useState(DEMO_ENTRIES);

  const isParent = role === "parent";

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">
              🎓 StudyQuest
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              Grammar School Exam Tracker & AI Mentor
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-primary-foreground">{displayName}</p>
              <Badge variant="secondary" className="text-xs capitalize">
                {role}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 h-14 bg-muted rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="mocks" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <ClipboardCheck className="h-4 w-4" />
              <span>Mocks</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <GraduationCap className="h-4 w-4" />
              <span>Classes</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <BarChart3 className="h-4 w-4" />
              <span>Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <Sparkles className="h-4 w-4" />
              <span>Mentor</span>
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

          <TabsContent value="mocks">
            <MockExamTracker />
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <ClassSchedule
              className="Amruta Maths Class"
              teacher="Amruta"
              subject="Maths"
              icon={<span className="text-xl">🧮</span>}
              accentClass="primary"
              canManageSchedule={isParent}
            />
            <ClassSchedule
              className="Newell Class"
              teacher="Newell"
              subject="11+ Prep"
              icon={<span className="text-xl">📚</span>}
              accentClass="success"
              canManageSchedule={isParent}
            />
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
