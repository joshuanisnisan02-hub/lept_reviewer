"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, BookOpenCheck, CheckCircle2, FileQuestion, Layers3, RefreshCcw, ShieldAlert } from "lucide-react";

type ModuleRow = {
  id:string;
  exam_level:string;
  exam_area:string;
  title:string;
  status:string;
  tos_weight:number|null;
};

type LessonRow = {
  id:string;
  module_id:string;
  title:string;
  sequence:number;
  status:string;
  learning_objectives:any;
  content:any;
  key_takeaways:any;
  modules?:{title:string;exam_level:string}|null;
};

type QuestionRow = {
  id:string;
  question:string;
  review_status:string;
  verified:boolean;
  exam_area:string;
  difficulty:string|null;
  modules?:{title:string}|null;
};

type FlashcardRow = {
  id:string;
  front:string;
  back:string;
  status:string;
  modules?:{title:string}|null;
};

const statuses=["draft","for_review","verified","published","superseded"];

export default function AdminContentPage(){
  const supabase=createClient();
  const [role,setRole]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"lessons"|"modules"|"questions"|"flashcards">("lessons");
  const [modules,setModules]=useState<ModuleRow[]>([]);
  const [lessons,setLessons]=useState<LessonRow[]>([]);
  const [questions,setQuestions]=useState<QuestionRow[]>([]);
  const [flashcards,setFlashcards]=useState<FlashcardRow[]>([]);
  const [selectedLesson,setSelectedLesson]=useState<LessonRow|null>(null);
  const [message,setMessage]=useState("");

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setRole(null);setLoading(false);return;}

    const {data:profile}=await supabase.from("profiles").select("role").eq("user_id",user.id).maybeSingle();
    setRole(profile?.role ?? "learner");

    if(profile?.role==="admin" || profile?.role==="content_reviewer"){
      const [m,l,q,f]=await Promise.all([
        supabase.from("modules").select("id,exam_level,exam_area,title,status,tos_weight").order("exam_area").order("sequence"),
        supabase.from("lessons").select("id,module_id,title,sequence,status,learning_objectives,content,key_takeaways,modules(title,exam_level)").order("sequence"),
        supabase.from("questions").select("id,question,review_status,verified,exam_area,difficulty,modules(title)").order("created_at",{ascending:false}).limit(100),
        supabase.from("flashcards").select("id,front,back,status,modules(title)").order("created_at",{ascending:false}).limit(100)
      ]);
      setModules((m.data??[]) as ModuleRow[]);
      setLessons((l.data??[]) as LessonRow[]);
      setQuestions((q.data??[]) as QuestionRow[]);
      setFlashcards((f.data??[]) as FlashcardRow[]);
    }
    setLoading(false);
  }

  async function updateStatus(table:"modules"|"lessons"|"flashcards",id:string,status:string){
    if(role!=="admin") return;
    const patch:any={status};
    if((table==="modules"||table==="lessons") && status==="published") patch.published_at=new Date().toISOString();
    const {error}=await supabase.from(table).update(patch).eq("id",id);
    if(error){setMessage(error.message);return;}
    setMessage("Status updated.");
    await load();
  }

  async function updateQuestion(id:string,status:string){
    if(role!=="admin") return;
    const patch:any={
      review_status:status,
      verified:status==="verified"||status==="published"
    };
    if(status==="published") patch.verified_at=new Date().toISOString();
    const {error}=await supabase.from("questions").update(patch).eq("id",id);
    if(error){setMessage(error.message);return;}
    setMessage("Question status updated.");
    await load();
  }

  const reviewLessonCount=useMemo(()=>lessons.filter(x=>x.status==="for_review").length,[lessons]);

  if(loading) return <AppShell><div className="mx-auto max-w-7xl p-5 sm:p-8"><div className="text-sm text-slate-500">Loading content review workspace...</div></div></AppShell>;

  if(role!=="admin" && role!=="content_reviewer") return <AppShell>
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <Card className="border-amber-200 bg-amber-50 shadow-none">
        <ShieldAlert className="text-amber-600"/>
        <h1 className="mt-4 text-xl font-bold">Reviewer access required</h1>
        <p className="mt-2 text-sm leading-6 text-amber-900">Sign in with an account assigned as content reviewer or administrator to open the review queue.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold underline">Return to dashboard</Link>
      </Card>
    </div>
  </AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Admin overview</Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-700">Content Review Workspace</p>
          <h1 className="mt-1 text-3xl font-bold">Review Before Publishing</h1>
          <p className="mt-2 max-w-3xl text-slate-500">Official competencies may be verified directly from source documents. Authored lessons, questions, and flashcards should remain For Review until a human reviewer approves them.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold"><RefreshCcw size={15}/> Refresh</button>
      </div>

      {role==="content_reviewer" && <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">You have reviewer access. Publishing/editing is currently restricted to administrators.</div>}
      {message && <div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card><Layers3 className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Modules</div><div className="mt-1 text-2xl font-bold">{modules.length}</div></Card>
        <Card><BookOpenCheck className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Lessons</div><div className="mt-1 text-2xl font-bold">{lessons.length}</div></Card>
        <Card><CheckCircle2 className="text-amber-600"/><div className="mt-3 text-sm text-slate-500">Lessons for Review</div><div className="mt-1 text-2xl font-bold">{reviewLessonCount}</div></Card>
        <Card><FileQuestion className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Questions</div><div className="mt-1 text-2xl font-bold">{questions.length}</div></Card>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {(["lessons","modules","questions","flashcards"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={"rounded-xl px-4 py-2 text-sm font-semibold capitalize "+(tab===x?"bg-indigo-700 text-white":"border bg-white text-slate-700")}>{x}</button>)}
      </div>

      {tab==="lessons" && <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="max-h-[650px] overflow-auto divide-y">
            {lessons.map((lesson:any)=><button key={lesson.id} onClick={()=>setSelectedLesson(lesson)} className={"block w-full p-4 text-left hover:bg-slate-50 "+(selectedLesson?.id===lesson.id?"bg-indigo-50":"")}>
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-xs font-semibold uppercase text-indigo-600">{lesson.modules?.exam_level} • {lesson.modules?.title}</div><div className="mt-1 font-semibold">{lesson.sequence}. {lesson.title}</div></div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize">{lesson.status.replace("_"," ")}</span>
              </div>
            </button>)}
          </div>
        </Card>

        <Card>
          {selectedLesson ? <>
            <div className="text-xs font-semibold uppercase text-indigo-600">{selectedLesson.modules?.exam_level} • {selectedLesson.modules?.title}</div>
            <h2 className="mt-2 text-xl font-bold">{selectedLesson.title}</h2>
            <section className="mt-5"><h3 className="text-sm font-bold">Learning Objectives</h3><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5">{JSON.stringify(selectedLesson.learning_objectives,null,2)}</pre></section>
            <section className="mt-5"><h3 className="text-sm font-bold">Content</h3><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5">{JSON.stringify(selectedLesson.content,null,2)}</pre></section>
            <section className="mt-5"><h3 className="text-sm font-bold">Key Takeaways</h3><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5">{JSON.stringify(selectedLesson.key_takeaways,null,2)}</pre></section>
            <label className="mt-5 block text-sm font-semibold">Status
              <select disabled={role!=="admin"} value={selectedLesson.status} onChange={e=>updateStatus("lessons",selectedLesson.id,e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal disabled:bg-slate-100">
                {statuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </label>
          </> : <div className="text-sm text-slate-500">Select a lesson to inspect its objectives, authored content, takeaways, and review status.</div>}
        </Card>
      </div>}

      {tab==="modules" && <Card className="mt-5 overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Level</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">TOS Weight</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{modules.map(m=><tr key={m.id}><td className="px-4 py-3">{m.exam_level}</td><td className="px-4 py-3 font-medium">{m.title}</td><td className="px-4 py-3">{m.tos_weight ?? "—"}%</td><td className="px-4 py-3"><select disabled={role!=="admin"} value={m.status} onChange={e=>updateStatus("modules",m.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody>
      </table></div></Card>}

      {tab==="questions" && <Card className="mt-5 overflow-hidden p-0">
        {questions.length ? <div className="divide-y">{questions.map(q=><div key={q.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-4xl"><div className="text-xs font-semibold uppercase text-indigo-600">{q.exam_area} • {q.modules?.title || "Unassigned"}</div><div className="mt-2 text-sm font-medium leading-6">{q.question}</div></div><select disabled={role!=="admin"} value={q.review_status} onChange={e=>updateQuestion(q.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>
        : <div className="p-6 text-sm text-slate-500">No authored questions are in the review queue yet.</div>}
      </Card>}

      {tab==="flashcards" && <Card className="mt-5 overflow-hidden p-0">
        {flashcards.length ? <div className="divide-y">{flashcards.map(f=><div key={f.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase text-indigo-600">{f.modules?.title || "Unassigned"}</div><div className="mt-2 font-semibold">{f.front}</div><div className="mt-1 text-sm text-slate-500">{f.back}</div></div><select disabled={role!=="admin"} value={f.status} onChange={e=>updateStatus("flashcards",f.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>
        : <div className="p-6 text-sm text-slate-500">No authored flashcards are in the review queue yet.</div>}
      </Card>}
    </div>
  </AppShell>;
}
