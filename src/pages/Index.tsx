import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDailyLogs } from "@/hooks/useDailyLogs";
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
import { subDays, format } from "date-fns";

const SUBJECT_FULL: Record<string, string> = {
  english: "English",
  maths: "Maths",
  vr: "Verbal Reasoning",
  nvr: "Non-Verbal Reasoning",
};

const Index = () => {
  const { displayName, role, signOut } = useAuth();
  const { logs, addLogs } = useDailyLogs();

  const isParent = role === "parent";

  const handleLogSubmit = (newEntries: { subject: string; minutes: number; questions: number; score: number }[]) => {
    addLogs.mutate(newEntries, {
      onSuccess: () => toast.success("Practice logged! Keep it up! 🎉"),
    });
  };

  const totalQuestions = logs.reduce((sum, e) => sum + e.questions, 0);

  // Calculate streak from logs
  const streak = useMemo(() => {
    const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse();
    let count = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (uniqueDates[i] === expected) count++;
      else if (i === 0 && uniqueDates[0] === format(subDays(new Date(), 1), "yyyy-MM-dd")) {
        // Allow yesterday as start
        count++;
      } else break;
    }
    return count;
  }, [logs]);

  // Weekly data
  const weeklyData = useMemo(() => {
    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const recentLogs = logs.filter((l) => l.date >= sevenDaysAgo);
    const subjects = ["english", "maths", "vr", "nvr"];
    return subjects.map((s) => {
      const subjectLogs = recentLogs.filter((l) => l.subject === s);
      return {
        subject: SUBJECT_FULL[s] || s,
        totalQuestions: subjectLogs.reduce((sum, l) => sum + l.questions, 0),
        avgScore: subjectLogs.length > 0 ? Math.round(subjectLogs.reduce((sum, l) => sum + l.score, 0) / subjectLogs.length) : 0,
      };
    });
  }, [logs]);

  const entries = logs.map((l) => ({
    date: l.date,
    subject: l.subject,
    score: l.score,
    questions: l.questions,
    minutes: l.minutes,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary px-4 py-5 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">🎓 StudyQuest</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">Grammar School Exam Tracker & AI Mentor</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-primary-foreground">{displayName}</p>
              <Badge variant="secondary" className="text-xs capitalize">{role}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10 h-11 w-11">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 h-14 bg-muted rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span><span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="mocks" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <ClipboardCheck className="h-4 w-4" /><span>Mocks</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <GraduationCap className="h-4 w-4" /><span>Classes</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <BarChart3 className="h-4 w-4" /><span>Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:shadow-card gap-1 sm:gap-2 flex-col sm:flex-row h-full">
              <Sparkles className="h-4 w-4" /><span>AI Mentor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5">
            <CountdownWidget />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StreakWidget streak={streak} />
              <LevelProgress totalQuestions={totalQuestions} />
            </div>
            <DailyLogForm onSubmit={handleLogSubmit} isSubmitting={addLogs.isPending} />
            <RecentScores entries={entries} />
          </TabsContent>

          <TabsContent value="mocks"><MockExamTracker /></TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <ClassSchedule className="Amruta Maths Class" teacher="Amruta" subject="Maths" icon={<span className="text-xl">🧮</span>} accentClass="primary" canManageSchedule={isParent} />
            <ClassSchedule className="Newell Class" teacher="Newell" subject="11+ Prep" icon={<span className="text-xl">📚</span>} accentClass="success" canManageSchedule={isParent} />
          </TabsContent>

          <TabsContent value="weekly"><WeeklyReport data={weeklyData} /></TabsContent>
          <TabsContent value="mentor"><AIMentorChat /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
