import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ClassScheduleRow {
  id: string;
  class_name: string;
  scheduled_date: string;
}

export interface ClassEntryRow {
  id: string;
  class_name: string;
  date: string;
  topics_covered: string;
  homework: string;
  notes: string;
  completed: boolean;
}

export const useClassData = (className: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["class_schedules", className],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("class_name", className);
      if (error) throw error;
      return data as ClassScheduleRow[];
    },
    enabled: !!user,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["class_entries", className],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_entries")
        .select("*")
        .eq("class_name", className)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ClassEntryRow[];
    },
    enabled: !!user,
  });

  const addScheduleDate = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("class_schedules").insert({
        user_id: user!.id,
        class_name: className,
        scheduled_date: date,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class_schedules", className] }),
  });

  const removeScheduleDate = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase
        .from("class_schedules")
        .delete()
        .eq("class_name", className)
        .eq("scheduled_date", date);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class_schedules", className] }),
  });

  const upsertEntry = useMutation({
    mutationFn: async (entry: { date: string; topics_covered: string; homework: string; notes: string }) => {
      const existing = entries.find((e) => e.date === entry.date);
      if (existing) {
        const { error } = await supabase
          .from("class_entries")
          .update({
            topics_covered: entry.topics_covered,
            homework: entry.homework,
            notes: entry.notes,
            completed: true,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("class_entries").insert({
          user_id: user!.id,
          class_name: className,
          date: entry.date,
          topics_covered: entry.topics_covered,
          homework: entry.homework,
          notes: entry.notes,
          completed: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class_entries", className] }),
  });

  return {
    schedules,
    entries,
    isLoading: schedulesLoading || entriesLoading,
    addScheduleDate,
    removeScheduleDate,
    upsertEntry,
  };
};
