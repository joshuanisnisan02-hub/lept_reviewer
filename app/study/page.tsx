import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BookOpenCheck, BookText, GraduationCap, Wrench } from "lucide-react";

export default async function Study() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AppShell><div className="mx-auto max-w-6xl p-5 sm:p-8">
      <p className="text-sm font-semibold text-indigo-700">Secondary LEPT</p>
      <h1 className="mt-1 text-3xl font-bold">Your Learning Path</h1>
      <Card className="mt-7">
        <h2 className="font-bold">Sign in required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to access your General Education, Professional Education, and Major review modules.</p>
        <Link href="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Sign In <ArrowRight size={16}/></Link>
      </Card>
    </div></AppShell>;
  }

  const [{ data: profile }, { data: modules }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("exam_level,specialization_id,program,specializations(name)").eq("user_id", user.id).maybeSingle(),
    supabase.from("modules")
      .select("id,title,description,exam_level,exam_area,specialization_id,sequence,estimated_minutes,tos_weight,difficulty,status")
      .eq("exam_level","Secondary")
      .eq("status","published")
      .order("exam_area")
      .order("sequence"),
    supabase.from("module_progress").select("module_id,mastery_score,completed_at").eq("user_id", user.id)
  ]);

  const progressMap = new Map((progress ?? []).map((p:any)=>[p.module_id,p]));
  const visible = (modules ?? []).filter((m:any)=>m.specialization_id===null || m.specialization_id===profile?.specialization_id);

  const specializationName = (profile as any)?.specializations?.name ?? profile?.program ?? "Major / Specialization";

  const sections = [
    {
      key:"General Education",
      title:"General Education",
      description:"Core Secondary LEPT general education review modules.",
      icon:BookText,
      items:visible.filter((m:any)=>m.exam_area==="General Education")
    },
    {
      key:"Professional Education",
      title:"Professional Education",
      description:"Teaching profession, curriculum, learners, assessment, field study, research, and teaching internship.",
      icon:GraduationCap,
      items:visible.filter((m:any)=>m.exam_area==="Professional Education")
    },
    {
      key:"Specialization",
      title:specializationName+" Major",
      description:"Review modules matched to the major or specialization saved in your learner account.",
      icon:Wrench,
      items:visible.filter((m:any)=>m.exam_area==="Specialization")
    }
  ];

  return <AppShell><div className="mx-auto max-w-6xl p-5 sm:p-8">
    <p className="text-sm font-semibold text-indigo-700">Secondary LEPT</p>
    <h1 className="mt-1 text-3xl font-bold">Your Learning Path</h1>
    <p className="mt-2 max-w-3xl text-slate-500">Study General Education, Professional Education, and your selected Major. Complete the lessons, then take each module assessment.</p>

    <div className="mt-8 space-y-12">
      {sections.map(section=>{
        const Icon=section.icon;
        return <section key={section.key}>
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={21}/></div>
            <div>
              <h2 className="text-xl font-bold">{section.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{section.description}</p>
            </div>
          </div>

          {section.items.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">
            {section.items.map((m:any)=>{
              const p:any=progressMap.get(m.id);
              const mastery=Math.round(Number(p?.mastery_score ?? 0));
              return <Card key={m.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Module {String(m.sequence ?? 1).padStart(2,"0")}</div>
                  {p?.completed_at && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completed</span>}
                </div>
                <h3 className="mt-2 text-lg font-bold">{m.title}</h3>
                {m.description && <p className="mt-2 text-sm leading-6 text-slate-600">{m.description}</p>}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {m.estimated_minutes && <span>{m.estimated_minutes} min</span>}
                  {m.tos_weight != null && <span>TOS weight {Number(m.tos_weight)}%</span>}
                  {m.difficulty && <span className="capitalize">{m.difficulty}</span>}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500">Module mastery</span><span className="font-semibold">{mastery}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{width:Math.min(mastery,100)+"%"}}/></div>
                <Link href={"/study/"+m.id} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">Open module <ArrowRight size={15}/></Link>
              </Card>
            })}
          </div> : <Card className="mt-5 border-dashed shadow-none">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-0.5 shrink-0 text-indigo-600"/>
              <div>
                <h3 className="font-bold">{section.key==="Specialization" ? "Major modules for this account are still being prepared." : "No published modules yet."}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Published review modules will appear here automatically when available.</p>
              </div>
            </div>
          </Card>}
        </section>;
      })}
    </div>
  </div></AppShell>;
}
