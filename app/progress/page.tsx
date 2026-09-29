import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, Clock3, Target, Trophy } from "lucide-react";

export default async function Progress() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <AppShell>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">Progress</h1>
      <Card className="mt-7 text-center shadow-none">
        <BarChart3 className="mx-auto text-indigo-600"/>
        <h2 className="mt-4 text-xl font-bold">Sign in to track real progress.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Your competency mastery, question accuracy, study time, completed modules, and review queue are tied to your learner account.</p>
        <Link href="/auth" className="mt-5 inline-block rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Sign In</Link>
      </Card>
    </div>
  </AppShell>;

  const [attemptsRes,sessionsRes,modulesRes,masteryRes,mistakesRes,cardsRes] = await Promise.all([
    supabase.from("question_attempts").select("is_correct,attempted_at").eq("user_id",user.id),
    supabase.from("study_sessions").select("duration_minutes").eq("user_id",user.id),
    supabase.from("module_progress").select("module_id,mastery_score,completed_at").eq("user_id",user.id),
    supabase.from("competency_mastery").select("mastery_score,last_reviewed,next_review_at,competencies(title,exam_area,tos_weight)").eq("user_id",user.id).order("mastery_score",{ascending:true}),
    supabase.from("mistake_status").select("status").eq("user_id",user.id),
    supabase.from("flashcard_reviews").select("flashcard_id,repetitions,next_review_at").eq("user_id",user.id)
  ]);

  const attempts = attemptsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const modules = modulesRes.data ?? [];
  const mastery = masteryRes.data ?? [];
  const mistakes = mistakesRes.data ?? [];
  const cards = cardsRes.data ?? [];

  const correct = attempts.filter((x:any)=>x.is_correct).length;
  const accuracy = attempts.length ? Math.round(correct/attempts.length*100) : 0;
  const studyMinutes = sessions.reduce((sum:number,x:any)=>sum + Number(x.duration_minutes ?? 0),0);
  const completedModules = modules.filter((x:any)=>x.completed_at).length;
  const weighted = mastery.map((x:any)=>({score:Number(x.mastery_score||0),weight:Number(x.competencies?.tos_weight||1)}));
  const weightTotal = weighted.reduce((s:number,x:any)=>s+x.weight,0);
  const readiness = weightTotal ? Math.round(weighted.reduce((s:number,x:any)=>s+(x.score*x.weight),0)/weightTotal) : 0;
  const areaReadiness = ["General Education","Professional Education","Specialization"].map(area=>{
    const rows=mastery.filter((x:any)=>x.competencies?.exam_area===area);
    const total=rows.reduce((s:number,x:any)=>s+Number(x.competencies?.tos_weight||1),0);
    const score=total?Math.round(rows.reduce((s:number,x:any)=>s+Number(x.mastery_score||0)*Number(x.competencies?.tos_weight||1),0)/total):0;
    return {area,score};
  });
  const unresolved = mistakes.filter((x:any)=>x.status==="unresolved").length;
  const masteredCards = cards.filter((x:any)=>Number(x.repetitions)>=3).length;

  return <AppShell>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">Progress</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Platform mastery is a study indicator based on your activity here. It is not an official LEPT rating or prediction of passing.</p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><Clock3 className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Study Time</div><div className="mt-1 text-2xl font-bold">{Math.floor(studyMinutes/60)}h {studyMinutes%60}m</div></Card>
        <Card><Target className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Question Accuracy</div><div className="mt-1 text-2xl font-bold">{accuracy}%</div><div className="mt-1 text-xs text-slate-500">{correct}/{attempts.length} correct</div></Card>
        <Card><Trophy className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Modules Completed</div><div className="mt-1 text-2xl font-bold">{completedModules}</div></Card>
        <Card><BarChart3 className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">TOS-Weighted Readiness</div><div className="mt-1 text-2xl font-bold">{readiness}%</div></Card>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">{areaReadiness.map(x=><Card key={x.area} className="shadow-none"><div className="text-sm text-slate-500">{x.area==="Specialization"?"Major in ICT":x.area}</div><div className="mt-1 text-2xl font-bold">{x.score}%</div></Card>)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <h2 className="text-lg font-bold">Competency Mastery</h2>
          {mastery.length ? <div className="mt-5 space-y-5">
            {mastery.map((x:any)=>{
              const score=Math.round(Number(x.mastery_score||0));
              return <div key={x.competencies?.title || String(score)}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                  <div><span className="font-medium">{x.competencies?.title || "Competency"}</span><span className="ml-2 text-xs text-slate-500">{x.competencies?.exam_area}</span></div>
                  <span className="font-semibold">{score}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-indigo-600" style={{width:score+"%"}}/></div>
              </div>;
            })}
          </div> : <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No competency mastery has been calculated yet. Complete verified practice questions to begin.</div>}
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Review Signals</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Unresolved mistakes</div><div className="mt-1 text-2xl font-bold">{unresolved}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Flashcards mastered</div><div className="mt-1 text-2xl font-bold">{masteredCards}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Questions answered</div><div className="mt-1 text-2xl font-bold">{attempts.length}</div></div>
          </div>
        </Card>
      </div>
    </div>
  </AppShell>;
}
