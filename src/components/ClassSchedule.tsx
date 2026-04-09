import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, BookOpen, PenLine, Lock, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useClassData } from "@/hooks/useClassData";
import { useAuth } from "@/hooks/useAuth";

interface ClassScheduleProps {
  className: string;
  teacher: string;
  subject: string;
  icon: React.ReactNode;
  accentClass: string;
  canManageSchedule?: boolean;
}

const ClassSchedule = ({ className: classTitle, teacher, subject, icon, accentClass, canManageSchedule = true }: ClassScheduleProps) => {
  const { schedules, entries, isLoading, addScheduleDate, removeScheduleDate, upsertEntry, deleteEntry } = useClassData(classTitle);
  const { role } = useAuth();
  const isParent = role === "parent";
  const isStudent = role === "student";
  const [isAddingDates, setIsAddingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [topicsCovered, setTopicsCovered] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null);
  const [deletionLog, setDeletionLog] = useState<string[]>([]);

  const scheduledDates = schedules.map((s) => parseISO(s.scheduled_date));

  const handleAddDates = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const exists = schedules.some((s) => s.scheduled_date === dateStr);
    if (exists) {
      removeScheduleDate.mutate(dateStr);
    } else {
      addScheduleDate.mutate(dateStr);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const isScheduled = schedules.some((s) => s.scheduled_date === dateStr);
    if (!isScheduled) return;

    const existing = entries.find((e) => e.date === dateStr);
    setSelectedDate(date);
    setTopicsCovered(existing?.topics_covered || "");
    setHomework(existing?.homework || "");
    setNotes(existing?.notes || "");
    setReadOnly(isStudent && !!existing?.completed);
    setDialogOpen(true);
  };

  const handleSaveEntry = () => {
    if (!selectedDate) return;
    upsertEntry.mutate(
      { date: format(selectedDate, "yyyy-MM-dd"), topics_covered: topicsCovered, homework, notes },
      {
        onSuccess: () => { setDialogOpen(false); toast.success(`${classTitle} class details saved! ✅`); },
        onError: (err) => { toast.error(`Failed to save class details: ${err.message}`); },
      }
    );
  };

  const handleDeleteEntry = (entry: { id: string; date: string }) => {
    setDeleteTarget(entry);
  };

  const confirmDeleteEntry = () => {
    if (!deleteTarget) return;
    const label = `🗑️ ${classTitle} entry for ${format(parseISO(deleteTarget.date), "dd MMM")} deleted`;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Class entry deleted");
        setDeletionLog((prev) => [...prev, label]);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(`Failed to delete: ${err.message}`);
        setDeleteTarget(null);
      },
    });
  };

  const getEntryForDate = (date: Date) => entries.find((e) => e.date === format(date, "yyyy-MM-dd"));

  const scheduledModifiers = {
    scheduled: scheduledDates,
    completed: scheduledDates.filter((d) => getEntryForDate(d)?.completed),
  };

  const scheduledStyles = {
    scheduled: {
      backgroundColor: "hsl(217 91% 60% / 0.18)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
      color: "hsl(217 91% 60%)",
    },
    completed: {
      backgroundColor: "hsl(142 71% 45% / 0.2)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
      color: "hsl(142 71% 45%)",
    },
  };

  if (isLoading) return <Card className="shadow-card p-8 text-center text-muted-foreground">Loading...</Card>;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            <div>
              <span>{classTitle}</span>
              <p className="text-xs font-normal text-muted-foreground">Teacher: {teacher} · {subject}</p>
            </div>
          </CardTitle>
          {canManageSchedule && (
            <Button size="sm" variant={isAddingDates ? "default" : "outline"} onClick={() => setIsAddingDates(!isAddingDates)} className="gap-1">
              {isAddingDates ? "Done" : <><Plus className="h-4 w-4" /> Schedule</>}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAddingDates && (
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2 font-medium">📅 Tap dates to add/remove class days:</p>
            <Calendar mode="single" selected={undefined} onSelect={handleAddDates} modifiers={scheduledModifiers} modifiersStyles={scheduledStyles} className="p-3 pointer-events-auto mx-auto" />
            <p className="text-xs text-muted-foreground mt-2 text-center">{scheduledDates.length} class{scheduledDates.length !== 1 ? "es" : ""} scheduled</p>
          </div>
        )}
        {!isAddingDates && (
          <>
            <p className="text-sm text-muted-foreground">📅 Tap a scheduled date to enter class details:</p>
            <Calendar mode="single" selected={undefined} onSelect={handleDateClick} modifiers={scheduledModifiers} modifiersStyles={scheduledStyles} className="p-3 pointer-events-auto mx-auto" />
            <div className="flex gap-3 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(217 91% 60% / 0.4)" }} />Scheduled</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142 71% 45% / 0.4)" }} />Completed</span>
            </div>
          </>
        )}
        {entries.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-semibold text-foreground">Recent Classes</p>
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-3 bg-card text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">{format(parseISO(entry.date), "dd MMM yyyy")}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">Done</Badge>
                    {isParent && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeleteEntry({ id: entry.id, date: entry.date })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {entry.topics_covered && <p className="text-muted-foreground"><BookOpen className="inline h-3 w-3 mr-1" />Topics: {entry.topics_covered}</p>}
                {entry.homework && <p className="text-muted-foreground"><PenLine className="inline h-3 w-3 mr-1" />Homework: {entry.homework}</p>}
                {entry.notes && <p className="text-muted-foreground italic">📝 {entry.notes}</p>}
              </div>
            ))}

            {deletionLog.length > 0 && (
              <div className="border-t border-border pt-3 mt-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">── Deletion Log ──</p>
                {deletionLog.map((log, i) => (
                  <p key={i} className="text-sm text-muted-foreground italic">{log}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}{classTitle} — {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""}
              {readOnly && <Badge variant="secondary" className="ml-2 gap-1"><Lock className="h-3 w-3" />Saved</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topics Covered</Label>
              <Textarea placeholder="e.g. Fractions, Algebra, Comprehension..." value={topicsCovered} onChange={(e) => setTopicsCovered(e.target.value)} className="min-h-[80px] text-base" disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>Homework / Practice Set</Label>
              <Input placeholder="e.g. Page 25-30, Bond Paper 5" value={homework} onChange={(e) => setHomework(e.target.value)} className="h-12" disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any observations, things to revise..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px] text-base" disabled={readOnly} />
            </div>
          </div>
          <DialogFooter>
            {readOnly ? (
              <p className="text-sm text-muted-foreground w-full text-center">🔒 Saved — only parents can edit</p>
            ) : (
              <Button onClick={handleSaveEntry} disabled={upsertEntry.isPending} className="w-full h-12 text-base">
                {upsertEntry.isPending ? "Saving..." : "Save Class Details"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {classTitle} entry for{" "}
              {deleteTarget ? format(parseISO(deleteTarget.date), "dd MMM yyyy") : ""}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ClassSchedule;
