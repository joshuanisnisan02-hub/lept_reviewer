import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { demoProfile, modules, todayPlan as demoPlan, weakAreas as demoWeakAreas } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BookOpenCheck, Brain, CalendarDays, CircleUserRound, Target } from "lucide-react";

function manilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: any = null;
  let plan: any[] = [];
  let mastery: any[] = [];
  let attempts = 0;
  let completedModules = 0;
  let masteredCards = 0;
  let latestDiagnostic: any = null;

  if (user) {
    const [profileRes, planRes, masteryRes, attemptsRes, modulesRes, cardsRes, diagnosticRes] = await Promise.all([
      supabase.from("profiles").select("full_name,exam_level,program,target_exam_date,daily_study_minutes,onboarding_completed,diagnostic_completed,specializations(name)").eq("user_id", user.id).maybeSingle(),
      supabase.from("study_plan_items").select("id,title,estimated_minutes,status,item_type").eq("user_id", user.id).eq("scheduled_date", manilaDate()).order("priority", { ascending: false }),
      supabase.from("competency_mastery").select("mastery_score,competencies(title,tos_weight)").eq("user_id", user.id).order("mastery_score", { ascending: true }).limit(5),
      supabase.from("question_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("module_progress").select("module_id", { count: "exact", head: true }).eq("user_id", user.id).not("completed_at", "is", null),
      supabase.from("flashcard_reviews").select("flashcard_id", { count: "exact", head: true }).eq("user_id", user.id).gte("repetitions", 3),
      supabase.from("assessment_sessions").select("id,score_percent,completed_at,status").eq("user_id", user.id).eq("assessment_type","diagnostic").eq("status","completed").order("completed_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    profile = profileRes.data;
    plan = planRes.data ?? [];
    mastery = masteryRes.data ?? [];
    attempts = attemptsRes.count ?? 0;
    completedModules = modulesRes.count ?? 0;
    masteredCards = cardsRes.count ?? 0;
    latestDiagnostic = diagnosticRes.data;
  }

  const signedIn = !!user;
  const next = modules.find(m => m.id === "prof-3")!;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || demoProfile.name;
  const level = profile?.exam_level || demoProfile.level;
  const specialization = profile?.specializations?.name || profile?.program || demoProfile.specialization;
  const realMasteryValues = mastery.map((x:any) => Number(x.mastery_score || 0));
  const readiness = realMasteryValues.length
    ? Math.round(realMasteryValues.reduce((a:number,b:number)=>a+b,0) / realMasteryValues.length)
    : signedIn ? 0 : demoProfile.readiness;

  const weakAreas = mastery.length
    ? mastery.map((x:any) => ({ name: x.competencies?.title || "Competency", score: Math.round(Number(x.mastery_score || 0)) }))
    : signedIn ? [] : demoWeakAreas;

  const planItems = plan.length
    ? plan.map((x:any) => ({ done: x.status === "done", label: x.title, meta: x.estimated_minutes ? x.estimated_minutes + " min" : x.item_type }))
    : signedIn ? [] : demoPlan;

  return <AppShell>
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Welcome, {displayName}.</p>
          <h1 className="mt-1 text-3xl font-bold">Your next LEPT goal is getting closer.</h1>
          <p className="mt-2 text-sm text-slate-500">{level} • {specialization}</p>
        </div>
        {!signedIn && <Link href="/auth" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><CircleUserRound size={17}/> Sign in to save progress</Link>}
      </div>

      {signedIn && profile && !profile.onboarding_completed && <Card className="mt-6 border-indigo-200 bg-indigo-50 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="font-bold text-indigo-950">Finish your review setup</div><p className="mt-1 text-sm text-indigo-800">Choose your LEPT level, specialization, target date, and study schedule so recommendations can be personalized.</p></div>
          <Link href="/onboarding" className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Continue Setup</Link>
        </div>
      </Card>}

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <div className="text-sm font-semibold text-indigo-700">Recommended Next</div>
          {signedIn && !profile?.diagnostic_completed ? <>
            <h2 className="mt-2 text-2xl font-bold">Take your diagnostic assessment</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Your mastery model has no assessment history yet. Start with a diagnostic so the platform can identify which competencies deserve priority.</p>
            <Link href="/practice?mode=diagnostic" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Start Diagnostic <ArrowRight size={16}/></Link>
          </> : <>
            <h2 className="mt-2 text-2xl font-bold">{weakAreas[0]?.name || next.title}</h2>
            <p className="mt-2 text-slate-600">{signedIn ? "This is currently among your lowest-scoring tracked competencies." : next.competency}</p>
            <div className="mt-4 text-sm text-slate-500">15 min review • 10 practice questions • 8 flashcards</div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/study" className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Start Review <ArrowRight size={16}/></Link>
              {latestDiagnostic?.id && <Link href={"/diagnostic/results?session=" + latestDiagnostic.id} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">View Diagnostic Results</Link>}
            </div>
          </>}
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Review Readiness</div>
          <div className="mt-1 text-4xl font-bold">{readiness}%</div>
          <p className="mt-3 text-sm leading-6 text-slate-500">{signedIn && !profile?.diagnostic_completed ? "Complete your diagnostic to begin calculating a personalized mastery profile." : "Based on your tracked platform mastery. This is not a pass prediction."}</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Today&apos;s Review Plan</h2><CalendarDays size={19} className="text-slate-400"/></div>
          {planItems.length ? <div className="mt-4 space-y-2">{planItems.map((x:any,i:number)=><div key={i} className="flex justify-between rounded-xl bg-slate-50 p-3"><span className={x.done?"text-slate-400 line-through":"font-medium"}>{x.done?"✓ ":"○ "}{x.label}</span><span className="text-xs text-slate-500">{x.meta}</span></div>)}</div>
            : <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><div className="font-semibold text-slate-800">No plan generated yet.</div><p className="mt-1">Complete your setup and diagnostic. Your daily plan will then prioritize high-weight weak competencies, review due items, and realistic study time.</p></div>}
        </Card>

        <Card>
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Weak Areas</h2><Target size={19} className="text-slate-400"/></div>
          {weakAreas.length ? <div className="mt-4 space-y-4">{weakAreas.slice(0,3).map((x:any)=><div key={x.name}><div className="flex justify-between text-sm"><span>{x.name}</span><b>{x.score}%</b></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{width:x.score+"%"}}/></div></div>)}</div>
            : <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Weak areas will appear after you complete diagnostic or practice questions.</div>}
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Card><BookOpenCheck className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Modules Completed</div><div className="mt-1 text-2xl font-bold">{signedIn ? completedModules : demoProfile.modulesCompleted}</div></Card>
        <Card><Target className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Questions Answered</div><div className="mt-1 text-2xl font-bold">{signedIn ? attempts.toLocaleString() : demoProfile.questions.toLocaleString()}</div></Card>
        <Card><Brain className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">Flashcards Mastered</div><div className="mt-1 text-2xl font-bold">{signedIn ? masteredCards : demoProfile.flashcards}</div></Card>
      </div>
    </div>
  </AppShell>;
}
