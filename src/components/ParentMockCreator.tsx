import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SUBJECTS = [
  { key: "english", label: "English", emoji: "📖" },
  { key: "maths", label: "Maths", emoji: "🔢" },
  { key: "vr", label: "Verbal Reasoning", emoji: "🧩" },
  { key: "nvr", label: "Non-Verbal Reasoning", emoji: "🔷" },
];

const ParentMockCreator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [examDate, setExamDate] = useState<Date>();
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch student user id (first student in profiles)
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

  // Fetch existing mock exams
  const { data: exams = [] } = useQuery({
    queryKey: ["ai_mock_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_mock_exams")
        .select("*")
        .order("scheduled_start", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleSubject = (key: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!examDate || selectedSubjects.length === 0 || !title.trim() || !studentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const dateStr = format(examDate, "yyyy-MM-dd");
      const scheduled_start = new Date(`${dateStr}T${startTime}:00`).toISOString();
      const scheduled_end = new Date(`${dateStr}T${endTime}:00`).toISOString();

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mock-exam`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            title,
            subjects: selectedSubjects,
            topics,
            num_questions: parseInt(numQuestions),
            student_user_id: studentId,
            scheduled_start,
            scheduled_end,
            parent_user_id: user!.id,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to create exam");
      }

      toast.success("Mock exam created! Questions are being generated 🎯");
      queryClient.invalidateQueries({ queryKey: ["ai_mock_exams"] });
      setShowForm(false);
      setTitle("");
      setSelectedSubjects([]);
      setTopics("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create exam");
    } finally {
      setIsCreating(false);
    }
  };

  const statusColor: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary",
    in_progress: "bg-warning/10 text-warning",
    completed: "bg-success/10 text-success",
    reviewed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border">
      <div className="gradient-primary rounded-t-2xl p-5">
        <h3 className="font-bold text-primary-foreground text-xl">🎓 Mock Exam Creator</h3>
        <p className="text-primary-foreground/70 text-sm">Create AI-generated mock exams for Pareet</p>
      </div>

      <div className="p-5 space-y-4">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full h-12 text-base gap-2">
            <Plus className="h-5 w-5" /> Create New Mock Exam
          </Button>
        ) : (
          <div className="space-y-4 bg-muted/50 rounded-xl p-4">
            <div>
              <Label className="text-sm font-medium">Exam Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 5 Practice Test" className="mt-1 h-12 text-base" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Subjects</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map((s) => (
                  <label key={s.key} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-all ${selectedSubjects.includes(s.key) ? "bg-primary/10 border-primary" : "bg-background border-border"}`}>
                    <Checkbox checked={selectedSubjects.includes(s.key)} onCheckedChange={() => toggleSubject(s.key)} />
                    <span className="text-sm">{s.emoji} {s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Topics (optional)</Label>
              <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. fractions, synonyms" className="mt-1 h-12 text-base" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Questions</Label>
                <Select value={numQuestions} onValueChange={setNumQuestions}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="30">30 questions</SelectItem>
                    <SelectItem value="50">50 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full mt-1 h-12 text-base justify-start", !examDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {examDate ? format(examDate, "d MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={examDate} onSelect={setExamDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-sm font-medium">End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 h-12 text-base" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={isCreating} className="flex-1 h-12 text-base">
                {isCreating ? "Generating..." : "Create Exam 🎯"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-12">Cancel</Button>
            </div>
          </div>
        )}

        {/* Exam List */}
        {exams.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">📋 Scheduled Exams</h4>
            {exams.map((exam: any) => (
              <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-foreground text-sm">{exam.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(exam.scheduled_start), "d MMM, HH:mm")} – {format(new Date(exam.scheduled_end), "HH:mm")}
                  </p>
                </div>
                <Badge className={statusColor[exam.status] || ""} variant="secondary">{exam.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentMockCreator;
