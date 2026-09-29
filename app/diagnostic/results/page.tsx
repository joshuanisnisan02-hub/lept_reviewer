"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, BarChart3, BookOpenCheck, CircleAlert, Target } from "lucide-react";

type AreaResult = {
  area: string;
  total: number;
  correct: number;
  accuracy: number;
};

type PriorityCompetency = {
  id: string;
  title: string;
  exam_area: string;
  mastery_score: number;
  next_review_at: string | null;
};

type DiagnosticResult = {
  session_id: string;
  status: string;
  score_percent: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string | null;
  by_area: AreaResult[];
  priority_competencies: PriorityCompetency[];
};

export default function DiagnosticResultsPage() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const supabase = createClient();

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, [sessionId]);

  async function load() {
    if (!sessionId) {
      setMessage("Diagnostic session was not specified.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in to view your diagnostic results.");
      setLoading(false);
      return;
    }

    const [{ data, error }, planRes] = await Promise.all([
      supabase.rpc("get_diagnostic_result", { p_session_id: sessionId }),
      supabase
        .from("study_plan_items")
        .select("id,scheduled_date,item_type,title,estimated_minutes,status,priority")
        .eq("user_id", user.id)
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .order("scheduled_date")
        .order("priority", { ascending: false })
        .limit(14)
    ]);

    if (error) {
      setMessage(error.message);
    } else if (!data) {
      setMessage("Diagnostic result could not be found.");
    } else {
      setResult(data as DiagnosticResult);
    }

    if (!planRes.error) setPlan(planRes.data ?? []);
    setLoading(false);
  }

  const strongest = useMemo(() => {
    if (!result?.by_area?.length) return null;
    return [...result.by_area].sort((a,b)=>Number(b.accuracy)-Number(a.accuracy))[0];
  }, [result]);

  const weakest = useMemo(() => {
    if (!result?.by_area?.length) return null;
    return [...result.by_area].sort((a,b)=>Number(a.accuracy)-Number(b.accuracy))[0];
  }, [result]);

  if (loading) return <AppShell>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="text-sm text-slate-500">Preparing your diagnostic analysis...</div>
    </div>
  </AppShell>;

  if (!result) return <AppShell>
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <Card className="border-amber-200 bg-amber-50 shadow-none">
        <CircleAlert className="text-amber-600"/>
        <h1 className="mt-4 text-xl font-bold">Diagnostic result unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-amber-900">{message || "The result could not be loaded."}</p>
        <Link href="/practice?mode=diagnostic" className="mt-5 inline-block font-semibold text-indigo-700">Return to Diagnostic</Link>
      </Card>
    </div>
  </AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <p className="text-sm font-semibold text-indigo-700">Diagnostic Complete</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Starting Review Profile</h1>
          <p className="mt-2 max-w-3xl text-slate-500">
            This diagnostic is a study-planning indicator based on the verified questions currently available in the platform. It is not an official LEPT rating or prediction.
          </p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">
          Go to Dashboard <ArrowRight size={16}/>
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <BarChart3 className="text-indigo-600"/>
          <div className="mt-4 text-sm text-slate-500">Diagnostic Score</div>
          <div className="mt-1 text-3xl font-bold">{Math.round(Number(result.score_percent || 0))}%</div>
        </Card>
        <Card>
          <Target className="text-indigo-600"/>
          <div className="mt-4 text-sm text-slate-500">Correct Answers</div>
          <div className="mt-1 text-3xl font-bold">{result.correct_answers}/{result.total_questions}</div>
        </Card>
        <Card>
          <BookOpenCheck className="text-emerald-600"/>
          <div className="mt-4 text-sm text-slate-500">Strongest Area</div>
          <div className="mt-1 text-lg font-bold">{strongest?.area || "Not enough data"}</div>
          {strongest && <div className="mt-1 text-xs text-slate-500">{Math.round(Number(strongest.accuracy))}% accuracy</div>}
        </Card>
        <Card>
          <CircleAlert className="text-amber-600"/>
          <div className="mt-4 text-sm text-slate-500">Priority Area</div>
          <div className="mt-1 text-lg font-bold">{weakest?.area || "Not enough data"}</div>
          {weakest && <div className="mt-1 text-xs text-slate-500">{Math.round(Number(weakest.accuracy))}% accuracy</div>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <Card>
          <h2 className="text-lg font-bold">Performance by Exam Area</h2>
          <p className="mt-1 text-sm text-slate-500">Use this to see where your current review effort should be concentrated.</p>

          {result.by_area?.length ? <div className="mt-5 space-y-5">
            {result.by_area.map(area => {
              const score = Math.round(Number(area.accuracy || 0));
              return <div key={area.area}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold">{area.area}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{area.correct}/{area.total} correct</div>
                  </div>
                  <div className="font-bold">{score}%</div>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-indigo-600" style={{width: score + "%"}}/>
                </div>
              </div>;
            })}
          </div> : <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No area-level analysis is available yet.</div>}
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Priority Competencies</h2>
          <p className="mt-1 text-sm text-slate-500">These competencies currently have the lowest measured mastery and should be reviewed first.</p>

          {result.priority_competencies?.length ? <div className="mt-5 space-y-3">
            {result.priority_competencies.map((item,index) => <div key={item.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{index+1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase text-indigo-600">{item.exam_area}</div>
                  <div className="mt-1 font-semibold leading-6">{item.title}</div>
                  <div className="mt-2 text-xs text-slate-500">Current mastery: {Math.round(Number(item.mastery_score || 0))}%</div>
                </div>
              </div>
            </div>)}
          </div> : <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Answer more verified questions to build competency-level priorities.</div>}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Your First Study Plan</h2>
            <p className="mt-1 text-sm text-slate-500">Generated from the weakest measured competencies and your daily study-time target.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-indigo-700">Continue from dashboard</Link>
        </div>

        {plan.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">
          {plan.map(item => <div key={item.id} className="rounded-xl border p-4">
            <div className="text-xs font-semibold uppercase text-indigo-600">{new Date(item.scheduled_date + "T00:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</div>
            <div className="mt-1 font-semibold">{item.title}</div>
            <div className="mt-2 text-xs text-slate-500">{item.estimated_minutes || 15} min • {item.item_type}</div>
          </div>)}
        </div> : <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No study-plan items were generated yet. This usually means there are not enough competency-level results from published questions.
        </div>}
      </Card>
    </div>
  </AppShell>;
}
