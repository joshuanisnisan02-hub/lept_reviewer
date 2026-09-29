"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, Circle, Clock3 } from "lucide-react";

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  exam_area: string;
  estimated_minutes: number | null;
};

type LessonRow = {
  id: string;
  title: string;
  sequence: number;
  learning_objectives: any;
  content: any;
  key_takeaways: any;
  estimated_minutes: number | null;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
  progress_percent: number;
  completed_at: string | null;
};

function normalizeList(value:any): string[] {
  if (Array.isArray(value)) return value.map(x => typeof x === "string" ? x : JSON.stringify(x));
  return [];
}

function ContentBlock({ content }: { content:any }) {
  if (!content) return null;
  if (typeof content === "string") return <p className="leading-7 text-slate-700">{content}</p>;
  if (Array.isArray(content)) return <div className="space-y-3">{content.map((x,i)=><ContentBlock key={i} content={x}/>)}</div>;
  if (typeof content === "object") {
    return <div className="space-y-5">{Object.entries(content).map(([key,value]) => <section key={key}>
      <h4 className="font-semibold capitalize text-slate-900">{key.replaceAll("_"," ")}</h4>
      <div className="mt-2 text-sm">
        {Array.isArray(value)
          ? <ul className="list-disc space-y-2 pl-5 text-slate-700">{value.map((x:any,i:number)=><li key={i}>{typeof x==="string"?x:JSON.stringify(x)}</li>)}</ul>
          : <ContentBlock content={value}/>}
      </div>
    </section>)}</div>;
  }
  return null;
}

export default function ModuleReader() {
  const params = useParams<{moduleId:string}>();
  const moduleId = params.moduleId;
  const supabase = createClient();

  const [module,setModule] = useState<ModuleRow|null>(null);
  const [lessons,setLessons] = useState<LessonRow[]>([]);
  const [progress,setProgress] = useState<ProgressRow[]>([]);
  const [activeLesson,setActiveLesson] = useState<string|null>(null);
  const [signedIn,setSignedIn] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");

  useEffect(()=>{ load(); },[moduleId]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setSignedIn(!!user);

    const [moduleRes,lessonsRes] = await Promise.all([
      supabase.from("modules").select("id,title,description,exam_area,estimated_minutes").eq("id",moduleId).eq("status","published").maybeSingle(),
      supabase.from("lessons").select("id,title,sequence,learning_objectives,content,key_takeaways,estimated_minutes").eq("module_id",moduleId).eq("status","published").order("sequence")
    ]);

    setModule(moduleRes.data as ModuleRow|null);
    const lessonRows=(lessonsRes.data ?? []) as LessonRow[];
    setLessons(lessonRows);
    setActiveLesson(lessonRows[0]?.id ?? null);

    if (user && lessonRows.length) {
      const { data } = await supabase.from("lesson_progress").select("lesson_id,status,progress_percent,completed_at").eq("user_id",user.id).in("lesson_id",lessonRows.map(x=>x.id));
      setProgress((data ?? []) as ProgressRow[]);
    }

    setLoading(false);
  }

  const progressMap=useMemo(()=>new Map(progress.map(x=>[x.lesson_id,x])),[progress]);
  const current=lessons.find(x=>x.id===activeLesson) ?? lessons[0];

  async function markComplete(lessonId:string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in to save lesson completion.");
      return;
    }

    const now=new Date().toISOString();
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id:user.id,
      lesson_id:lessonId,
      status:"completed",
      progress_percent:100,
      completed_at:now,
      updated_at:now
    },{onConflict:"user_id,lesson_id"});

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextProgress=[...progress.filter(x=>x.lesson_id!==lessonId),{lesson_id:lessonId,status:"completed",progress_percent:100,completed_at:now}];
    setProgress(nextProgress);

    const completedCount=nextProgress.filter(x=>x.completed_at).length;
    if (lessons.length && completedCount >= lessons.length) {
      const { data: existing } = await supabase.from("module_progress").select("mastery_score").eq("user_id",user.id).eq("module_id",moduleId).maybeSingle();
      await supabase.from("module_progress").upsert({
        user_id:user.id,
        module_id:moduleId,
        mastery_score:Number(existing?.mastery_score ?? 0),
        completed_at:now,
        updated_at:now
      },{onConflict:"user_id,module_id"});
      setMessage("Module complete. Your learning-path progress has been updated.");
    } else {
      setMessage("Lesson marked complete.");
    }
  }

  if (loading) return <AppShell><div className="mx-auto max-w-6xl p-5 sm:p-8"><div className="text-sm text-slate-500">Loading module...</div></div></AppShell>;

  if (!module) return <AppShell>
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <Link href="/study" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Back to learning path</Link>
      <Card className="mt-6 border-dashed text-center shadow-none"><h1 className="text-xl font-bold">Module unavailable</h1><p className="mt-2 text-sm text-slate-500">This module may not be published or may not exist.</p></Card>
    </div>
  </AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <Link href="/study" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Back to learning path</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold text-indigo-700">{module.exam_area}</p>
        <h1 className="mt-1 text-3xl font-bold">{module.title}</h1>
        {module.description && <p className="mt-2 max-w-3xl leading-7 text-slate-500">{module.description}</p>}
      </div>

      {message && <div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}

      {!signedIn && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">You can read published lessons as a guest. <Link href="/auth" className="font-semibold underline">Sign in</Link> to save completion.</div>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-3">
          <div className="px-2 pb-3 pt-1 text-sm font-bold">Lessons</div>
          <div className="space-y-1">
            {lessons.map((lesson:any) => {
              const done=!!progressMap.get(lesson.id)?.completed_at;
              return <button key={lesson.id} onClick={()=>setActiveLesson(lesson.id)} className={"flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition " + (activeLesson===lesson.id ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50")}>
                {done?<CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/>:<Circle size={17} className="mt-0.5 shrink-0 text-slate-300"/>}
                <span><span className="block text-xs text-slate-400">Lesson {lesson.sequence}</span><span className="font-medium">{lesson.title}</span></span>
              </button>;
            })}
          </div>
        </Card>

        {current ? <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Lesson {current.sequence}</div><h2 className="mt-2 text-2xl font-bold">{current.title}</h2></div>
            {current.estimated_minutes && <div className="inline-flex items-center gap-2 text-sm text-slate-500"><Clock3 size={16}/>{current.estimated_minutes} min</div>}
          </div>

          {normalizeList(current.learning_objectives).length>0 && <section className="mt-7"><h3 className="text-lg font-bold">Learning Objectives</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{normalizeList(current.learning_objectives).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}

          <section className="mt-7"><h3 className="text-lg font-bold">Lesson</h3><div className="mt-4"><ContentBlock content={current.content}/></div></section>

          {normalizeList(current.key_takeaways).length>0 && <section className="mt-7 rounded-2xl bg-slate-50 p-5"><h3 className="font-bold">Key Takeaways</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{normalizeList(current.key_takeaways).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}

          <div className="mt-8 flex justify-end">
            <button disabled={!!progressMap.get(current.id)?.completed_at} onClick={()=>markComplete(current.id)} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-emerald-600">
              {progressMap.get(current.id)?.completed_at ? "Completed" : "Mark Lesson Complete"}
            </button>
          </div>
        </Card> : <Card><p className="text-sm text-slate-500">No published lessons are available in this module yet.</p></Card>}
      </div>
    </div>
  </AppShell>;
}
