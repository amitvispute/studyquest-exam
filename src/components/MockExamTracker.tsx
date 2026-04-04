import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, ChevronUp, CalendarIcon, Pencil } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMockExams, MockExam } from "@/hooks/useMockExams";
import { useAuth } from "@/hooks/useAuth";

const MockExamTracker = () => {
  const { role } = useAuth();
  const { mocks, isLoading, addMock, updateMock } = useMockExams();
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState<Date>();
  const [provider, setProvider] = useState("");
  const [englishScore, setEnglishScore] = useState("");
  const [mathsScore, setMathsScore] = useState("");
  const [vrScore, setVrScore] = useState("");
  const [nvrScore, setNvrScore] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [maxScore, setMaxScore] = useState("400");
  const [notes, setNotes] = useState("");

  const isParent = role === "parent";

  const resetForm = () => {
    setDate(undefined);
    setProvider("");
    setEnglishScore("");
    setMathsScore("");
    setVrScore("");
    setNvrScore("");
    setTotalScore("");
    setMaxScore("400");
    setNotes("");
    setEditingId(null);
  };

  const handleEdit = (mock: MockExam) => {
    setEditingId(mock.id);
    setDate(new Date(mock.date));
    setProvider(mock.provider);
    setEnglishScore(mock.english_score?.toString() ?? "");
    setMathsScore(mock.maths_score?.toString() ?? "");
    setVrScore(mock.vr_score?.toString() ?? "");
    setNvrScore(mock.nvr_score?.toString() ?? "");
    setTotalScore(mock.total_score?.toString() ?? "");
    setMaxScore(mock.max_score?.toString() ?? "400");
    setNotes(mock.notes || "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!date || !provider) {
      toast.error("Please enter date and exam provider");
      return;
    }

    const payload = {
      date: format(date, "yyyy-MM-dd"),
      provider,
      english_score: englishScore ? Number(englishScore) : null,
      maths_score: mathsScore ? Number(mathsScore) : null,
      vr_score: vrScore ? Number(vrScore) : null,
      nvr_score: nvrScore ? Number(nvrScore) : null,
      total_score: totalScore ? Number(totalScore) : null,
      max_score: maxScore ? Number(maxScore) : null,
      notes: notes || "",
    };

    if (editingId) {
      updateMock.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            setShowForm(false);
            resetForm();
            toast.success("Mock exam result updated! ✅");
          },
        }
      );
    } else {
      addMock.mutate(payload, {
        onSuccess: () => {
          setShowForm(false);
          resetForm();
          toast.success("Results saved successfully! ✅");
        },
      });
    }
  };

  const getScoreBadge = (score: number | null, max: number = 100) => {
    if (score === null) return null;
    const pct = max === 100 ? score : (score / max) * 100;
    const isGood = pct >= 85;
    return (
      <Badge variant={isGood ? "default" : "secondary"} className={isGood ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
        {score}
      </Badge>
    );
  };

  // Default: last 7 days; or filter by specific date
  const sevenDaysAgo = subDays(new Date(), 7);
  const filteredMocks = filterDate
    ? mocks.filter((m) => m.date === format(filterDate, "yyyy-MM-dd"))
    : mocks.filter((m) => isAfter(new Date(m.date), sevenDaysAgo));

  // Dates that have scores (for calendar highlighting)
  const mockDates = mocks.map((m) => new Date(m.date));

  if (isLoading) return <div className="text-center text-muted-foreground p-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Mock Exam Results
            </CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1", filterDate && "text-primary")}>
                    <CalendarIcon className="h-4 w-4" />
                    {filterDate ? format(filterDate, "d MMM") : "Filter"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    className="p-3 pointer-events-auto"
                    modifiers={{ hasScore: mockDates }}
                    modifiersClassNames={{ hasScore: "bg-primary/20 font-bold" }}
                  />
                  {filterDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilterDate(undefined)}>
                        Clear filter (show last 7 days)
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Both roles can add results */}
              <Button size="sm" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="gap-1">
                {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Close" : "Add Result"}
              </Button>
            </div>
          </div>
          {!filterDate && (
            <p className="text-xs text-muted-foreground mt-1">Showing last 7 days</p>
          )}
        </CardHeader>
        {showForm && (
          <CardContent className="border-t border-border pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Exam Provider / Name</Label>
                <Input placeholder="e.g. GL Assessment, Bond" value={provider} onChange={(e) => setProvider(e.target.value)} className="h-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="text-sm">English</Label><Input type="number" placeholder="Score" value={englishScore} onChange={(e) => setEnglishScore(e.target.value)} className="h-12" /></div>
              <div className="space-y-2"><Label className="text-sm">Maths</Label><Input type="number" placeholder="Score" value={mathsScore} onChange={(e) => setMathsScore(e.target.value)} className="h-12" /></div>
              <div className="space-y-2"><Label className="text-sm">VR</Label><Input type="number" placeholder="Score" value={vrScore} onChange={(e) => setVrScore(e.target.value)} className="h-12" /></div>
              <div className="space-y-2"><Label className="text-sm">NVR</Label><Input type="number" placeholder="Score" value={nvrScore} onChange={(e) => setNvrScore(e.target.value)} className="h-12" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-sm">Total Score</Label><Input type="number" placeholder="Total" value={totalScore} onChange={(e) => setTotalScore(e.target.value)} className="h-12" /></div>
              <div className="space-y-2"><Label className="text-sm">Max Score</Label><Input type="number" placeholder="400" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="h-12" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              <Textarea placeholder="Any observations, areas to improve..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px]" />
            </div>
            <Button onClick={handleSubmit} disabled={addMock.isPending || updateMock.isPending} className="w-full h-12 text-base">
              {addMock.isPending || updateMock.isPending ? "Saving..." : editingId ? "Update Result" : "Save Mock Result"}
            </Button>
          </CardContent>
        )}
      </Card>
      <div className="space-y-3">
        {filteredMocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <p className="text-3xl mb-2">📋</p>
            <p>{filterDate ? "No results for this date" : "No results in the last 7 days"}</p>
          </div>
        ) : (
          filteredMocks.map((mock) => (
            <Card key={mock.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{mock.provider}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(mock.date), "dd MMM yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {mock.total_score !== null && mock.max_score !== null && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{mock.total_score}/{mock.max_score}</p>
                        <p className="text-xs text-muted-foreground">{Math.round((mock.total_score / mock.max_score) * 100)}%</p>
                      </div>
                    )}
                    {isParent && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(mock)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {mock.english_score !== null && <span className="text-xs">Eng: {getScoreBadge(mock.english_score)}</span>}
                  {mock.maths_score !== null && <span className="text-xs">Maths: {getScoreBadge(mock.maths_score)}</span>}
                  {mock.vr_score !== null && <span className="text-xs">VR: {getScoreBadge(mock.vr_score)}</span>}
                  {mock.nvr_score !== null && <span className="text-xs">NVR: {getScoreBadge(mock.nvr_score)}</span>}
                </div>
                {mock.notes && <p className="text-sm text-muted-foreground italic">{mock.notes}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MockExamTracker;
