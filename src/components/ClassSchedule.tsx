import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, Plus, BookOpen, PenLine } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClassEntry {
  date: string;
  topicsCovered: string;
  homework: string;
  notes: string;
  completed: boolean;
}

interface ClassScheduleProps {
  className: string;
  teacher: string;
  subject: string;
  icon: React.ReactNode;
  accentClass: string;
}

const ClassSchedule = ({ className: classTitle, teacher, subject, icon, accentClass }: ClassScheduleProps) => {
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [isAddingDates, setIsAddingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form fields for class entry
  const [topicsCovered, setTopicsCovered] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");

  const handleAddDates = (date: Date | undefined) => {
    if (!date) return;
    setScheduledDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) return prev.filter((d) => !isSameDay(d, date));
      return [...prev, date];
    });
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    const isScheduled = scheduledDates.some((d) => isSameDay(d, date));
    if (!isScheduled) return;

    const existing = entries.find((e) => e.date === format(date, "yyyy-MM-dd"));
    setSelectedDate(date);
    setTopicsCovered(existing?.topicsCovered || "");
    setHomework(existing?.homework || "");
    setNotes(existing?.notes || "");
    setDialogOpen(true);
  };

  const handleSaveEntry = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const newEntry: ClassEntry = {
      date: dateStr,
      topicsCovered,
      homework,
      notes,
      completed: true,
    };

    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== dateStr);
      return [...filtered, newEntry];
    });
    setDialogOpen(false);
    toast.success(`${classTitle} class details saved! ✅`);
  };

  const getEntryForDate = (date: Date) => entries.find((e) => e.date === format(date, "yyyy-MM-dd"));

  const scheduledModifiers = {
    scheduled: scheduledDates,
    completed: scheduledDates.filter((d) => getEntryForDate(d)?.completed),
  };

  const scheduledStyles = {
    scheduled: {
      backgroundColor: "hsl(var(--primary) / 0.15)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
      color: "hsl(var(--primary))",
    },
    completed: {
      backgroundColor: "hsl(var(--success) / 0.2)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
      color: "hsl(var(--success))",
    },
  };

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
          <Button
            size="sm"
            variant={isAddingDates ? "default" : "outline"}
            onClick={() => setIsAddingDates(!isAddingDates)}
            className="gap-1"
          >
            {isAddingDates ? "Done" : <><Plus className="h-4 w-4" /> Schedule</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAddingDates && (
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2 font-medium">
              📅 Tap dates to add/remove class days:
            </p>
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={handleAddDates}
              modifiers={scheduledModifiers}
              modifiersStyles={scheduledStyles}
              className="p-3 pointer-events-auto mx-auto"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {scheduledDates.length} class{scheduledDates.length !== 1 ? "es" : ""} scheduled
            </p>
          </div>
        )}

        {!isAddingDates && (
          <>
            <p className="text-sm text-muted-foreground">
              📅 Tap a scheduled date to enter class details:
            </p>
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={handleDateClick}
              modifiers={scheduledModifiers}
              modifiersStyles={scheduledStyles}
              className="p-3 pointer-events-auto mx-auto"
            />
            <div className="flex gap-3 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }} />
                Scheduled
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--success) / 0.3)" }} />
                Completed
              </span>
            </div>
          </>
        )}

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-semibold text-foreground">Recent Classes</p>
            {entries
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((entry) => (
                <div key={entry.date} className="rounded-lg border border-border p-3 bg-card text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">
                      {format(new Date(entry.date), "dd MMM yyyy")}
                    </span>
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">Done</Badge>
                  </div>
                  {entry.topicsCovered && (
                    <p className="text-muted-foreground"><BookOpen className="inline h-3 w-3 mr-1" />Topics: {entry.topicsCovered}</p>
                  )}
                  {entry.homework && (
                    <p className="text-muted-foreground"><PenLine className="inline h-3 w-3 mr-1" />Homework: {entry.homework}</p>
                  )}
                  {entry.notes && (
                    <p className="text-muted-foreground italic">📝 {entry.notes}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>

      {/* Entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {classTitle} — {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topics Covered</Label>
              <Textarea
                placeholder="e.g. Fractions, Algebra, Comprehension..."
                value={topicsCovered}
                onChange={(e) => setTopicsCovered(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Homework / Practice Set</Label>
              <Input
                placeholder="e.g. Page 25-30, Bond Paper 5"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any observations, things to revise..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEntry} className="w-full">Save Class Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ClassSchedule;
