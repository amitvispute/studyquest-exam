import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings } from "lucide-react";

const ParentCreditSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState("20");
  const [saving, setSaving] = useState(false);

  // Get student ID
  const { data: studentId } = useQuery({
    queryKey: ["student_user_id"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student")
        .limit(1)
        .single();
      return data?.user_id ?? null;
    },
    enabled: !!user,
  });

  // Get current settings
  const { data: settings } = useQuery({
    queryKey: ["ai_mentor_settings", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_mentor_settings")
        .select("*")
        .eq("student_user_id", studentId!)
        .single();
      return data;
    },
    enabled: !!studentId,
  });

  // Get today's usage
  const { data: todayUsage } = useQuery({
    queryKey: ["ai_mentor_usage_today", studentId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("ai_mentor_usage")
        .select("message_count")
        .eq("user_id", studentId!)
        .eq("date", today)
        .single();
      return data?.message_count ?? 0;
    },
    enabled: !!studentId,
  });

  useEffect(() => {
    if (settings) setLimit(String(settings.daily_limit));
  }, [settings]);

  const handleSave = async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("ai_mentor_settings")
        .select("id")
        .eq("student_user_id", studentId)
        .single();

      if (existing) {
        await supabase
          .from("ai_mentor_settings")
          .update({ daily_limit: parseInt(limit), updated_by: user!.id, updated_at: new Date().toISOString() })
          .eq("student_user_id", studentId);
      } else {
        await supabase
          .from("ai_mentor_settings")
          .insert({ student_user_id: studentId, daily_limit: parseInt(limit), updated_by: user!.id });
      }
      toast.success("Daily chat limit updated! ✅");
      queryClient.invalidateQueries({ queryKey: ["ai_mentor_settings"] });
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" />
          AI Mentor Credit Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Today's usage</p>
          <p className="text-2xl font-bold text-foreground">
            {todayUsage ?? 0} / {settings?.daily_limit ?? 20} messages
          </p>
        </div>
        <div className="space-y-2">
          <Label>Daily message limit for student</Label>
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min={5}
            max={100}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">
            Student gets a warning at 80% and is blocked at 100%. Resets daily.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base">
          {saving ? "Saving..." : "Save Limit"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ParentCreditSettings;
