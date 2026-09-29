import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BookText, GraduationCap, MonitorCog } from "lucide-react";

export default async function Study() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AppShell><div className="mx-auto max-w-6xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">Your LEPT Learning Path</h1>
      <Card className="mt-7">
        <h2 className="font-bold">Sign in required</h2>
        <p className="mt-2 text-sm text-slate-600">Sign in to access the Secondary LEPT reviewer.</p>
        <Link href="/auth" className="mt-5 inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Sign In</Link>
      </Card>
    </div></AppShell>;
  }

  const [
    { data: modules },
    { data: progress },
    { data: ictSpec }
  ] = await Promise.all([
    supabase.from("modules")
      .select("id,title,description,exam_area,specialization_id,sequence,estimated_minutes,tos_weight,difficulty,status")
      .eq("exam_level","Secondary")
      .eq("status","published")
      .order("exam_area")
      .order("sequence"),
    supabase.from("module_progress")
      .select("module_id,mastery_score,completed_at")
      .eq("user_id", user.id),
    supabase.from("specializations")
      .select("id,name")
      .eq("exam_level","Secondary")
      .eq("name","Information and Communication Technology")
      .maybeSingle()
  ]);

  const progressMap = new Map((progress ?? []).map((p:any)=>[p.module_id,p]));
  const all = modules ?? [];
  const genEd = all.filter((m:any)=>m.exam_area==="General Education" && m.specialization_id===null);
  const profEd = all.filter((m:any)=>m.exam_area==="Professional Education" && m.specialization_id===null);
  const ict = all.filter((m:any)=>m.exam_area==="Specialization" && m.specialization_id===ictSpec?.id);

  const categories = [
    {
      key:"ge",
      title:"General Education",
      subtitle:"Core Category 1",
      description:"Secondary LEPT General Education modules.",
      icon:BookText,
      items:genEd
    },
    {
      key:"pe",
      title:"Professional Education",
      subtitle:"Core Category 2",
      description:"Teaching foundations, curriculum, learners, assessment, field study, and professional practice.",
      icon:GraduationCap,
      items:profEd
    },
    {
      key:"ict",
      title:"Major in ICT",
      subtitle:"Core Category 3",
      description:"ICT-focused TLE/Tech-Voc review aligned to the current PRC TOS and CHED BTLEd-ICT curriculum.",
      icon:MonitorCog,
      items:ict
    }
  ];

  return <AppShell><div className="mx-auto max-w-7xl p-5 sm:p-8">
    <p className="text-sm font-semibold text-indigo-700">Secondary LEPT • ICT Focus</p>
    <h1 className="mt-1 text-3xl font-bold">Your Learning Path</h1>
    <p className="mt-2 max-w-3xl text-slate-500">Choose one of the three core categories. Each category contains the modules you need to read, complete, and assess.</p>

    <div className="mt-8 grid gap-5 xl:grid-cols-3">
      {categories.map(category=>{
        const Icon=category.icon;
        return <Card key={category.key} className="flex min-h-[520px] flex-col">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={22}/></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{category.subtitle}</div>
              <h2 className="mt-1 text-xl font-bold">{category.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{category.description}</p>
            </div>
          </div>

          <div className="mt-5 border-t pt-4">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Modules</span><span>{category.items.length}</span>
            </div>
            <div className="space-y-3">
              {category.items.length ? category.items.map((m:any)=>{
                const p:any=progressMap.get(m.id);
                const mastery=Math.round(Number(p?.mastery_score ?? 0));
                return <Link key={m.id} href={"/study/"+m.id} className="block rounded-xl border p-4 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-indigo-600">Module {String(m.sequence ?? 1).padStart(2,"0")}</div>
                    {p?.completed_at && <span className="text-xs font-semibold text-emerald-700">Completed</span>}
                  </div>
                  <div className="mt-1 font-semibold leading-6">{m.title}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {m.estimated_minutes && <span>{m.estimated_minutes} min</span>}
                    {m.tos_weight != null && <span>TOS {Number(m.tos_weight)}%</span>}
                    <span>{mastery}% mastery</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">Open module <ArrowRight size={13}/></div>
                </Link>
              }) : <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Modules are being prepared.</div>}
            </div>
          </div>
        </Card>;
      })}
    </div>
  </div></AppShell>;
}
