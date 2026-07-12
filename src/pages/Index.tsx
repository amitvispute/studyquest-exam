import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CountdownWidget from "@/components/CountdownWidget";
import StreakWidget from "@/components/StreakWidget";
import LevelProgress from "@/components/LevelProgress";
import DailyLogForm from "@/components/DailyLogForm";
import RecentScores from "@/components/RecentScores";
import WeeklyReport from "@/components/WeeklyReport";
import AIMentorChat from "@/components/AIMentorChat";
import MockExamTracker from "@/components/MockExamTracker";
import AIExamHistory from "@/components/AIExamHistory";
import ClassSchedule from "@/components/ClassSchedule";
import ParentSummaryDashboard from "@/components/ParentSummaryDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BarChart3, Sparkles, ClipboardCheck, GraduationCap, LogOut, Star } from "lucide-react";
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
  const { displayName, role, user, signOut } = useAuth();
  const { logs, addLogs } = useDailyLogs();

  const isParent = role === "parent";
  const isStudent = role === "student";

  // Bug 1: Check for scheduled exams (student only)
  const { data: pendingExamCount = 0 } = useQuery({
    queryKey: ["pending_exam_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_mock_exams")
        .select("*", { count: "exact", head: true })
        .eq("student_user_id", user!.id)
        .eq("status", "scheduled")
        .gt("scheduled_end", new Date().toISOString());
      return count ?? 0;
    },
    enabled: !!user && isStudent,
    refetchInterval: 30000,
  });

  // Bug 2: Check for today's completed AI exams (student notification on Mocks tab)
  const { data: todayCompletedCount = 0 } = useQuery({
    queryKey: ["today_completed_exams"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("ai_mock_exams")
        .select("*", { count: "exact", head: true })
        .eq("student_user_id", user!.id)
        .eq("status", "completed")
        .gte("scheduled_start", `${today}T00:00:00`)
        .lte("scheduled_start", `${today}T23:59:59`);
      return count ?? 0;
    },
    enabled: !!user && isStudent,
    refetchInterval: 30000,
  });

  const handleLogSubmit = (newEntries: { subject: string; minutes: number; questions: number; score: number }[]) => {
    addLogs.mutate(newEntries, {
      onSuccess: () => toast.success("Practice logged! Keep it up! 🎉"),
    });
  };

  const totalQuestions = logs.reduce((sum, e) => sum + e.questions, 0);

  const streak = useMemo(() => {
    const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse();
    let count = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (uniqueDates[i] === expected) count++;
      else if (i === 0 && uniqueDates[0] === format(subDays(new Date(), 1), "yyyy-MM-dd")) {
        count++;
      } else break;
    }
    return count;
  }, [logs]);

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
          <TabsList className="grid grid-cols-5 h-16 bg-muted rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2 flex-col sm:flex-row h-full min-h-[44px]">
              <BookOpen className="h-5 w-5" /><span className="hidden sm:inline">Dashboard</span><span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="mocks" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2 flex-col sm:flex-row h-full min-h-[44px] relative">
              <ClipboardCheck className="h-5 w-5" /><span>Mocks</span>
              {isStudent && todayCompletedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground animate-pulse">
                  {todayCompletedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2 flex-col sm:flex-row h-full min-h-[44px]">
              <GraduationCap className="h-5 w-5" /><span>Classes</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2 flex-col sm:flex-row h-full min-h-[44px]">
              <BarChart3 className="h-5 w-5" /><span>Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="mentor" className="rounded-lg text-sm font-semibold data-[state=active]:shadow-card gap-2 flex-col sm:flex-row h-full min-h-[44px] relative">
              <Sparkles className="h-5 w-5" /><span>AI Mentor</span>
              {isStudent && pendingExamCount > 0 && (
                <Star className="absolute -top-1 -right-1 h-5 w-5 text-warning fill-warning animate-pulse drop-shadow-lg" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5">
            <CountdownWidget />
            {isParent ? (
              <>
                <ParentSummaryDashboard logs={logs} streak={streak} totalQuestions={totalQuestions} />
                <RecentScores entries={entries} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StreakWidget streak={streak} />
                  <LevelProgress totalQuestions={totalQuestions} />
                </div>
                <DailyLogForm onSubmit={handleLogSubmit} isSubmitting={addLogs.isPending} />
                <RecentScores entries={entries} />
              </>
            )}
          </TabsContent>

          <TabsContent value="mocks" className="space-y-4">
            <Tabs defaultValue="ai" className="space-y-4">
              <TabsList className="grid grid-cols-2 h-12">
                <TabsTrigger value="ai" className="text-sm">AI Mock Exams</TabsTrigger>
                <TabsTrigger value="log" className="text-sm">Practice Log</TabsTrigger>
              </TabsList>
              <TabsContent value="ai"><AIExamHistory /></TabsContent>
              <TabsContent value="log"><MockExamTracker /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClassSchedule className="Amruta Maths Class" teacher="Amruta" subject="Maths" icon={<span className="text-xl">🧮</span>} accentClass="primary" canManageSchedule={isParent} />
              <ClassSchedule className="Newell Class" teacher="Newell" subject="11+ Prep" icon={<span className="text-xl">📚</span>} accentClass="success" canManageSchedule={isParent} />
            </div>
          </TabsContent>

          <TabsContent value="weekly"><WeeklyReport data={weeklyData} /></TabsContent>
          <TabsContent value="mentor"><AIMentorChat /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
