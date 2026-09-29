import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { BookOpenCheck, Database, FileCheck2, Shield, TriangleAlert } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "content_reviewer") {
    return <AppShell>
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <Card className="border-amber-200 bg-amber-50 shadow-none">
          <div className="flex gap-3"><TriangleAlert className="mt-0.5 shrink-0 text-amber-600"/><div>
            <h1 className="text-xl font-bold text-amber-950">Content administration access required</h1>
            <p className="mt-2 text-sm leading-6 text-amber-900">This area is reserved for verified content reviewers and administrators. Learner accounts cannot change source, competency, question, or publication status.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-amber-900 underline">Return to dashboard</Link>
          </div></div>
        </Card>
      </div>
    </AppShell>;
  }

  const [sourceRes, competencyRes, moduleRes, lessonRes, questionRes, coverageRes] = await Promise.all([
    supabase.from("sources").select("id,organization,document_title,status,last_checked_at,is_active").order("authority_level"),
    supabase.from("competencies").select("id,status"),
    supabase.from("modules").select("id,status"),
    supabase.from("lessons").select("id,status"),
    supabase.from("questions").select("id,verified,review_status"),
    supabase.from("competencies").select("id,code,title,exam_level,exam_area,tos_weight,status,modules:module_competencies(modules(id,title,status)),questions(id,verified,review_status)").order("exam_area").order("title")
  ]);

  const competencies = competencyRes.data ?? [];
  const modules = moduleRes.data ?? [];
  const lessons = lessonRes.data ?? [];
  const questions = questionRes.data ?? [];
  const coverage = coverageRes.data ?? [];
  const sources = sourceRes.data ?? [];

  const stats = [
    ["Sources", sources.length, Database],
    ["Competencies", competencies.length, Shield],
    ["Modules", modules.length, BookOpenCheck],
    ["Questions", questions.length, FileCheck2],
  ] as const;

  return <AppShell>
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <p className="text-sm font-semibold text-indigo-700">Content Administration</p>
      <h1 className="mt-1 text-3xl font-bold">TOS Coverage & Verification</h1>
      <p className="mt-2 max-w-3xl text-slate-500">Use this area to confirm that current PRC competencies are covered before learner-facing content is published. Draft or unverified authored content remains outside normal learner mode until approved.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin/content" className="inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Open Content Review Workspace</Link>
        <Link href="/admin/questions" className="inline-flex rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Open Question Bank</Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label,value,Icon]) => <Card key={label}><Icon className="text-indigo-600"/><div className="mt-4 text-sm text-slate-500">{label}</div><div className="mt-1 text-3xl font-bold">{value}</div></Card>)}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b p-5"><h2 className="text-lg font-bold">TOS Coverage Matrix</h2><p className="mt-1 text-sm text-slate-500">Official PRC Professional Education competencies are now loaded. Question coverage will increase as reviewed items are published.</p></div>
          {coverage.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Competency</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Modules</th><th className="px-4 py-3">Verified Qs</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">{coverage.map((row:any) => {
              const moduleCount = row.modules?.filter((x:any)=>x.modules).length ?? 0;
              const verifiedQuestions = row.questions?.filter((q:any)=>q.verified && q.review_status === "published").length ?? 0;
              const coverageStatus = moduleCount > 0 && verifiedQuestions >= 10 ? "Covered" : moduleCount > 0 ? "Needs Questions" : "Needs Content";
              return <tr key={row.id}><td className="px-5 py-4"><div className="font-semibold">{row.title}</div><div className="mt-1 text-xs text-slate-500">{row.code || row.exam_level}</div></td><td className="px-4 py-4">{row.exam_area}</td><td className="px-4 py-4">{row.tos_weight ?? "—"}</td><td className="px-4 py-4">{moduleCount}</td><td className="px-4 py-4">{verifiedQuestions}</td><td className="px-4 py-4"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (coverageStatus === "Covered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{coverageStatus}</span></td></tr>;
            })}</tbody>
          </table></div> : <div className="p-6 text-sm text-slate-600">No official competencies have been loaded yet. This is intentional: the production matrix will be populated only from the current PRC TOS.</div>}
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Source Freshness</h2>
          <div className="mt-4 space-y-4">{sources.map((source:any)=><div key={source.id} className="border-b pb-4 last:border-0 last:pb-0"><div className="text-xs font-semibold uppercase text-indigo-600">{source.organization}</div><div className="mt-1 text-sm font-semibold">{source.document_title}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span className="capitalize">{source.status}</span><span>{source.last_checked_at || "Not checked"}</span></div></div>)}</div>
        </Card>
      </div>

      <div className="mt-5 text-xs text-slate-500">Lessons currently registered: {lessons.length}. Verified and published questions: {questions.filter((q:any)=>q.verified && q.review_status==="published").length}.</div>
    </div>
  </AppShell>;
}
