import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyLogEntry {
  subject: string;
  minutes: number;
  questions: number;
  score: number;
}

export interface DailyLog {
  id: string;
  date: string;
  subject: string;
  minutes: number;
  questions: number;
  score: number;
}

export const useDailyLogs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["daily_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as DailyLog[];
    },
    enabled: !!user,
  });

  const addLogs = useMutation({
    mutationFn: async (entries: DailyLogEntry[]) => {
      const today = new Date().toISOString().split("T")[0];
      const rows = entries.map((e) => ({
        user_id: user!.id,
        date: today,
        subject: e.subject,
        minutes: e.minutes,
        questions: e.questions,
        score: e.score,
      }));
      const { error } = await supabase.from("daily_logs").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily_logs"] }),
  });

  return { logs, isLoading, addLogs };
};
