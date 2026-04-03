import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MockExam {
  id: string;
  date: string;
  provider: string;
  english_score: number | null;
  maths_score: number | null;
  vr_score: number | null;
  nvr_score: number | null;
  total_score: number | null;
  max_score: number | null;
  notes: string;
}

export const useMockExams = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ["mock_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_exams")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as MockExam[];
    },
    enabled: !!user,
  });

  const addMock = useMutation({
    mutationFn: async (mock: Omit<MockExam, "id">) => {
      const { error } = await supabase.from("mock_exams").insert({
        user_id: user!.id,
        ...mock,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mock_exams"] }),
  });

  return { mocks, isLoading, addMock };
};
