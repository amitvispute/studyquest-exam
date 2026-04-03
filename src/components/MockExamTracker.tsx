import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MockExam {
  id: string;
  date: string;
  provider: string;
  englishScore: number | null;
  mathsScore: number | null;
  vrScore: number | null;
  nvrScore: number | null;
  totalScore: number | null;
  maxScore: number | null;
  notes: string;
}

const DEMO_MOCKS: MockExam[] = [
  {
    id: "1",
    date: "2025-06-28",
    provider: "GL Assessment",
    englishScore: 82,
    mathsScore: 75,
    vrScore: 88,
    nvrScore: 79,
    totalScore: 324,
    maxScore: 400,
    notes: "Need more practice on comprehension passages",
  },
  {
    id: "2",
    date: "2025-06-14",
    provider: "Bond Papers",
    englishScore: 78,
    mathsScore: 70,
    vrScore: 85,
    nvrScore: 82,
    totalScore: 315,
    maxScore: 400,
    notes: "Time management was an issue in maths",
  },
];

const MockExamTracker = () => {
  const [mocks, setMocks] = useState<MockExam[]>(DEMO_MOCKS);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState<Date>();
  const [provider, setProvider] = useState("");
  const [englishScore, setEnglishScore] = useState("");
  const [mathsScore, setMathsScore] = useState("");
  const [vrScore, setVrScore] = useState("");
  const [nvrScore, setNvrScore] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [maxScore, setMaxScore] = useState("400");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!date || !provider) {
      toast.error("Please enter date and exam provider");
      return;
    }

    const newMock: MockExam = {
      id: Date.now().toString(),
      date: format(date, "yyyy-MM-dd"),
      provider,
      englishScore: englishScore ? Number(englishScore) : null,
      mathsScore: mathsScore ? Number(mathsScore) : null,
      vrScore: vrScore ? Number(vrScore) : null,
      nvrScore: nvrScore ? Number(nvrScore) : null,
      totalScore: totalScore ? Number(totalScore) : null,
      maxScore: maxScore ? Number(maxScore) : null,
      notes,
    };

    setMocks((prev) => [newMock, ...prev]);
    setShowForm(false);
    setDate(undefined);
    setProvider("");
    setEnglishScore("");
    setMathsScore("");
    setVrScore("");
    setNvrScore("");
    setTotalScore("");
    setMaxScore("400");
    setNotes("");
    toast.success("Mock exam result saved! 📝");
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

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Mock Exam Results
            </CardTitle>
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
              {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Close" : "Add Result"}
            </Button>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="border-t border-border pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
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
                <Input placeholder="e.g. GL Assessment, Bond" value={provider} onChange={(e) => setProvider(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">English</Label>
                <Input type="number" placeholder="Score" value={englishScore} onChange={(e) => setEnglishScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Maths</Label>
                <Input type="number" placeholder="Score" value={mathsScore} onChange={(e) => setMathsScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">VR</Label>
                <Input type="number" placeholder="Score" value={vrScore} onChange={(e) => setVrScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NVR</Label>
                <Input type="number" placeholder="Score" value={nvrScore} onChange={(e) => setNvrScore(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Total Score</Label>
                <Input type="number" placeholder="Total" value={totalScore} onChange={(e) => setTotalScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Score</Label>
                <Input type="number" placeholder="400" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Any observations, areas to improve..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button onClick={handleSubmit} className="w-full">Save Mock Result</Button>
          </CardContent>
        )}
      </Card>

      {/* Results list */}
      <div className="space-y-3">
        {mocks.map((mock) => (
          <Card key={mock.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{mock.provider}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(mock.date), "dd MMM yyyy")}</p>
                </div>
                {mock.totalScore !== null && mock.maxScore !== null && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{mock.totalScore}/{mock.maxScore}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((mock.totalScore / mock.maxScore) * 100)}%
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {mock.englishScore !== null && (
                  <span className="text-xs">Eng: {getScoreBadge(mock.englishScore)}</span>
                )}
                {mock.mathsScore !== null && (
                  <span className="text-xs">Maths: {getScoreBadge(mock.mathsScore)}</span>
                )}
                {mock.vrScore !== null && (
                  <span className="text-xs">VR: {getScoreBadge(mock.vrScore)}</span>
                )}
                {mock.nvrScore !== null && (
                  <span className="text-xs">NVR: {getScoreBadge(mock.nvrScore)}</span>
                )}
              </div>
              {mock.notes && <p className="text-sm text-muted-foreground italic">{mock.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MockExamTracker;
