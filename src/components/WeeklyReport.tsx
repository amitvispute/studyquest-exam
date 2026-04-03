import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface SubjectData {
  subject: string;
  totalQuestions: number;
  avgScore: number;
}

interface WeeklyReportProps {
  data: SubjectData[];
}

const SUBJECT_COLORS: Record<string, string> = {
  English: "hsl(213, 55%, 25%)",
  Maths: "hsl(152, 60%, 42%)",
  "Verbal Reasoning": "hsl(38, 92%, 50%)",
  "Non-Verbal Reasoning": "hsl(25, 95%, 55%)",
};

const WeeklyReport = ({ data }: WeeklyReportProps) => {
  const totalQuestions = data.reduce((sum, d) => sum + d.totalQuestions, 0);
  const avgScore = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.avgScore, 0) / data.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border text-center">
          <p className="text-sm text-muted-foreground font-medium">Total Questions (7 days)</p>
          <p className="text-4xl font-extrabold text-foreground mt-1">{totalQuestions}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-card border border-border text-center ${
          avgScore >= 85 ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"
        }`}>
          <p className="text-sm text-muted-foreground font-medium">Average Score</p>
          <p className={`text-4xl font-extrabold mt-1 ${
            avgScore >= 85 ? "text-success" : "text-warning"
          }`}>
            {avgScore}%
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <h3 className="text-lg font-bold text-foreground mb-4">📊 Subject Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid hsl(214, 25%, 88%)",
                boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)",
              }}
            />
            <Bar dataKey="avgScore" radius={[8, 8, 0, 0]} name="Avg Score %">
              {data.map((entry) => (
                <Cell
                  key={entry.subject}
                  fill={SUBJECT_COLORS[entry.subject] || "hsl(213, 55%, 25%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Focus tip:</strong>{" "}
            {data.length > 0
              ? `${data.reduce((min, d) => (d.avgScore < min.avgScore ? d : min), data[0]).subject} needs the most attention this week.`
              : "Log some practice to see insights!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
