import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { modules as demoModules } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BookOpenCheck } from "lucide-react";

export default async function Study() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AppShell>
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <p className="text-sm font-semibold text-indigo-700">Demo Learning Path</p>
        <h1 className="mt-1 text-3xl font-bold">Your LEPT Learning Path</h1>
        <p className="mt-2 max-w-2xl text-slate-500">These cards are sample structure only. Sign in to use published, source-backed modules and save real progress.</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {demoModules.map(m => <Card key={m.id}>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{m.area} • Module {m.number}</div>
            <h2 className="mt-2 text-lg font-bold">{m.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{m.competency}</p>
            <div className="mt-4 flex justify-between text-xs text-slate-500"><span>{m.minutes} min</span><span>Demo progress {m.progress}%</span></div>
            <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{width:m.progress+"%"}}/></div>
          </Card>)}
        </div>
        <Link href="/auth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Sign in for real learning path <ArrowRight size={16}/></Link>
      </div>
    </AppShell>;
  }

  const [{ data: profile }, { data: modules }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("exam_level,specialization_id,program").eq("user_id", user.id).maybeSingle(),
    supabase.from("modules")
      .select("id,title,description,exam_level,exam_area,specialization_id,sequence,estimated_minutes,tos_weight,difficulty,status")
      .eq("status", "published")
      .order("exam_area")
      .order("sequence"),
    supabase.from("module_progress").select("module_id,mastery_score,completed_at").eq("user_id", user.id)
  ]);

  const progressMap = new Map((progress ?? []).map((p:any) => [p.module_id, p]));
  const visible = (modules ?? []).filter((m:any) =>
    m.exam_level === profile?.exam_level &&
    (m.specialization_id === null || m.specialization_id === profile?.specialization_id)
  );

  return <AppShell>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <p className="text-sm font-semibold text-indigo-700">Published Review Modules</p>
      <h1 className="mt-1 text-3xl font-bold">Your LEPT Learning Path</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Only reviewed and published modules for your selected LEPT level and specialization appear here.</p>

      {visible.length ? <div className="mt-7 grid gap-4 md:grid-cols-2">
        {visible.map((m:any) => {
          const p:any = progressMap.get(m.id);
          const score = Math.round(Number(p?.mastery_score ?? 0));
          return <Card key={m.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{m.exam_area} • Module {String(m.sequence || 1).padStart(2,"0")}</div>
              {p?.completed_at && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completed</span>}
            </div>
            <h2 className="mt-2 text-lg font-bold">{m.title}</h2>
            {m.description && <p className="mt-2 text-sm leading-6 text-slate-600">{m.description}</p>}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {m.estimated_minutes && <span>{m.estimated_minutes} min</span>}
              {m.tos_weight != null && <span>TOS weight {m.tos_weight}</span>}
              {m.difficulty && <span className="capitalize">{m.difficulty}</span>}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500">Module mastery</span><span className="font-semibold">{score}%</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{width:score+"%"}}/></div>
            <Link href={"/study/" + m.id} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">Open module <ArrowRight size={15}/></Link>
          </Card>;
        })}
      </div> : <Card className="mt-7 border-dashed shadow-none">
        <div className="flex items-start gap-3">
          <BookOpenCheck className="mt-0.5 shrink-0 text-indigo-600"/>
          <div>
            <h2 className="font-bold">Your verified learning path is being prepared.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">No reviewed modules are published for your selected track yet. This is intentional: modules will appear only after the current PRC TOS competency matrix has been extracted, mapped, and verified.</p>
            <Link href="/sources" className="mt-4 inline-block text-sm font-semibold text-indigo-700">View source registry</Link>
          </div>
        </div>
      </Card>}
    </div>
  </AppShell>;
}
