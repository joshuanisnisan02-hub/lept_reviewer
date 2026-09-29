"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, BookOpenCheck, CheckCircle2, FileQuestion, Layers3, Plus, RefreshCcw, ShieldAlert } from "lucide-react";

type ModuleRow={id:string;exam_level:string;exam_area:string;title:string;status:string;tos_weight:number|null};
type LessonRow={id:string;module_id:string;title:string;sequence:number;status:string;learning_objectives:any;content:any;key_takeaways:any;modules?:{title:string;exam_level:string}|null};
type CompetencyRow={id:string;code:string|null;title:string;description:string|null;exam_level:string;exam_area:string;official_source_id:string|null};
type SourceRow={id:string;organization:string;document_title:string;status:string};
type QuestionRow={id:string;question:string;review_status:string;verified:boolean;exam_area:string;difficulty:string|null;modules?:{title:string}|null};
type FlashcardRow={id:string;front:string;back:string;status:string;modules?:{title:string}|null};

const statuses=["draft","for_review","verified","published","superseded"];

const blankQuestion={
  module_id:"",lesson_id:"",competency_id:"",source_id:"",
  question:"",choice_a:"",choice_b:"",choice_c:"",choice_d:"",
  correct_answer:"A",rationale:"",rationale_a:"",rationale_b:"",rationale_c:"",rationale_d:"",
  bloom_level:"Understand",difficulty:"moderate"
};

const blankFlashcard={
  module_id:"",lesson_id:"",competency_id:"",source_id:"",
  front:"",back:"",card_type:"concept"
};

export default function AdminContentPage(){
  const supabase=createClient();
  const [role,setRole]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"lessons"|"modules"|"questions"|"flashcards">("lessons");
  const [modules,setModules]=useState<ModuleRow[]>([]);
  const [lessons,setLessons]=useState<LessonRow[]>([]);
  const [competencies,setCompetencies]=useState<CompetencyRow[]>([]);
  const [sources,setSources]=useState<SourceRow[]>([]);
  const [questions,setQuestions]=useState<QuestionRow[]>([]);
  const [flashcards,setFlashcards]=useState<FlashcardRow[]>([]);
  const [selectedLesson,setSelectedLesson]=useState<LessonRow|null>(null);
  const [questionForm,setQuestionForm]=useState(blankQuestion);
  const [flashcardForm,setFlashcardForm]=useState(blankFlashcard);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setRole(null);setLoading(false);return;}

    const {data:profile}=await supabase.from("profiles").select("role").eq("user_id",user.id).maybeSingle();
    setRole(profile?.role??"learner");

    if(profile?.role==="admin"||profile?.role==="content_reviewer"){
      const [m,l,c,s,q,f]=await Promise.all([
        supabase.from("modules").select("id,exam_level,exam_area,title,status,tos_weight").eq("exam_level","Secondary").order("exam_area").order("sequence"),
        supabase.from("lessons").select("id,module_id,title,sequence,status,learning_objectives,content,key_takeaways,modules!inner(title,exam_level)").eq("modules.exam_level","Secondary").order("sequence"),
        supabase.from("competencies").select("id,code,title,description,exam_level,exam_area,official_source_id").eq("exam_level","Secondary").order("exam_area").order("title"),
        supabase.from("sources").select("id,organization,document_title,status").in("status",["verified","published"]).order("organization"),
        supabase.from("questions").select("id,question,review_status,verified,exam_area,difficulty,modules(title)").eq("exam_level","Secondary").order("created_at",{ascending:false}).limit(100),
        supabase.from("flashcards").select("id,front,back,status,modules(title)").order("created_at",{ascending:false}).limit(100)
      ]);
      setModules((m.data??[]) as ModuleRow[]);
      setLessons((l.data??[]) as LessonRow[]);
      setCompetencies((c.data??[]) as CompetencyRow[]);
      setSources((s.data??[]) as SourceRow[]);
      setQuestions((q.data??[]) as QuestionRow[]);
      setFlashcards((f.data??[]) as FlashcardRow[]);
    }
    setLoading(false);
  }

  const selectedQuestionModule=modules.find(m=>m.id===questionForm.module_id);
  const selectedFlashcardModule=modules.find(m=>m.id===flashcardForm.module_id);

  const questionLessons=lessons.filter(l=>l.module_id===questionForm.module_id);
  const flashcardLessons=lessons.filter(l=>l.module_id===flashcardForm.module_id);

  const questionCompetencies=competencies.filter(c=>
    selectedQuestionModule &&
    c.exam_level===selectedQuestionModule.exam_level &&
    c.exam_area===selectedQuestionModule.exam_area
  );
  const flashcardCompetencies=competencies.filter(c=>
    selectedFlashcardModule &&
    c.exam_level===selectedFlashcardModule.exam_level &&
    c.exam_area===selectedFlashcardModule.exam_area
  );

  async function updateStatus(table:"modules"|"lessons"|"flashcards",id:string,status:string){
    if(role!=="admin") return;
    const patch:any={status};
    if((table==="modules"||table==="lessons")&&status==="published") patch.published_at=new Date().toISOString();
    const {error}=await supabase.from(table).update(patch).eq("id",id);
    if(error){setMessage(error.message);return;}
    setMessage("Status updated.");
    await load();
  }

  async function updateQuestion(id:string,status:string){
    if(role!=="admin") return;
    const {data:{user}}=await supabase.auth.getUser();
    const patch:any={review_status:status,verified:status==="verified"||status==="published"};
    if(status==="verified"||status==="published"){
      patch.reviewed_by=user?.id??null;
      patch.verified_at=new Date().toISOString();
    }
    const {error}=await supabase.from("questions").update(patch).eq("id",id);
    if(error){setMessage(error.message);return;}
    setMessage("Question status updated.");
    await load();
  }

  async function createQuestion(status:"draft"|"for_review"){
    if(role!=="admin") return;
    if(!questionForm.module_id||!questionForm.competency_id||!questionForm.question.trim()||
      !questionForm.choice_a.trim()||!questionForm.choice_b.trim()||!questionForm.choice_c.trim()||!questionForm.choice_d.trim()||
      !questionForm.rationale.trim()){
      setMessage("Complete the module, competency, question, all four choices, and rationale.");
      return;
    }

    const module=modules.find(m=>m.id===questionForm.module_id);
    const competency=competencies.find(c=>c.id===questionForm.competency_id);
    if(!module||!competency) return;

    setSaving(true);
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from("questions").insert({
      question:questionForm.question.trim(),
      choice_a:questionForm.choice_a.trim(),
      choice_b:questionForm.choice_b.trim(),
      choice_c:questionForm.choice_c.trim(),
      choice_d:questionForm.choice_d.trim(),
      correct_answer:questionForm.correct_answer,
      rationale:questionForm.rationale.trim(),
      rationale_a:questionForm.rationale_a.trim()||null,
      rationale_b:questionForm.rationale_b.trim()||null,
      rationale_c:questionForm.rationale_c.trim()||null,
      rationale_d:questionForm.rationale_d.trim()||null,
      exam_level:module.exam_level,
      exam_area:module.exam_area,
      module_id:module.id,
      lesson_id:questionForm.lesson_id||null,
      competency_id:competency.id,
      source_id:questionForm.source_id||competency.official_source_id||null,
      tos_reference:competency.code||competency.title,
      bloom_level:questionForm.bloom_level,
      difficulty:questionForm.difficulty,
      question_type:"multiple_choice",
      review_status:status,
      verified:false,
      created_by:user?.id??null
    });

    setSaving(false);
    if(error){setMessage(error.message);return;}
    setQuestionForm(blankQuestion);
    setMessage(status==="draft"?"Question saved as draft.":"Question submitted for review.");
    await load();
  }

  async function createFlashcard(status:"draft"|"for_review"){
    if(role!=="admin") return;
    if(!flashcardForm.module_id||!flashcardForm.competency_id||!flashcardForm.front.trim()||!flashcardForm.back.trim()){
      setMessage("Complete the module, competency, front, and back.");
      return;
    }
    const module=modules.find(m=>m.id===flashcardForm.module_id);
    const competency=competencies.find(c=>c.id===flashcardForm.competency_id);
    if(!module||!competency) return;

    setSaving(true);
    const {error}=await supabase.from("flashcards").insert({
      module_id:module.id,
      lesson_id:flashcardForm.lesson_id||null,
      competency_id:competency.id,
      source_id:flashcardForm.source_id||competency.official_source_id||null,
      card_type:flashcardForm.card_type,
      front:flashcardForm.front.trim(),
      back:flashcardForm.back.trim(),
      status
    });
    setSaving(false);
    if(error){setMessage(error.message);return;}
    setFlashcardForm(blankFlashcard);
    setMessage(status==="draft"?"Flashcard saved as draft.":"Flashcard submitted for review.");
    await load();
  }

  const reviewLessonCount=useMemo(()=>lessons.filter(x=>x.status==="for_review").length,[lessons]);

  if(loading) return <AppShell><div className="mx-auto max-w-7xl p-5 sm:p-8"><div className="text-sm text-slate-500">Loading content review workspace...</div></div></AppShell>;

  if(role!=="admin"&&role!=="content_reviewer") return <AppShell>
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
          <h1 className="mt-1 text-3xl font-bold">Author, Review, Publish</h1>
          <p className="mt-2 max-w-3xl text-slate-500">This build is limited to Secondary LEPT. Questions and flashcards are authored against verified TOS competencies and sources; learners see only published content for their selected Secondary major.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold"><RefreshCcw size={15}/> Refresh</button>
      </div>

      {role==="content_reviewer"&&<div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">You have reviewer access. Publishing and authoring are currently restricted to administrators.</div>}
      {message&&<div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card><Layers3 className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Modules</div><div className="mt-1 text-2xl font-bold">{modules.length}</div></Card>
        <Card><BookOpenCheck className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Lessons</div><div className="mt-1 text-2xl font-bold">{lessons.length}</div></Card>
        <Card><CheckCircle2 className="text-amber-600"/><div className="mt-3 text-sm text-slate-500">Lessons for Review</div><div className="mt-1 text-2xl font-bold">{reviewLessonCount}</div></Card>
        <Card><FileQuestion className="text-indigo-600"/><div className="mt-3 text-sm text-slate-500">Questions</div><div className="mt-1 text-2xl font-bold">{questions.length}</div></Card>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {(["lessons","modules","questions","flashcards"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={"rounded-xl px-4 py-2 text-sm font-semibold capitalize "+(tab===x?"bg-indigo-700 text-white":"border bg-white text-slate-700")}>{x}</button>)}
      </div>

      {tab==="lessons"&&<div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <Card className="overflow-hidden p-0"><div className="max-h-[650px] divide-y overflow-auto">
          {lessons.map((lesson:any)=><button key={lesson.id} onClick={()=>setSelectedLesson(lesson)} className={"block w-full p-4 text-left hover:bg-slate-50 "+(selectedLesson?.id===lesson.id?"bg-indigo-50":"")}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs font-semibold uppercase text-indigo-600">{lesson.modules?.exam_level} • {lesson.modules?.title}</div><div className="mt-1 font-semibold">{lesson.sequence}. {lesson.title}</div></div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize">{lesson.status.replace("_"," ")}</span>
            </div>
          </button>)}
        </div></Card>
        <Card>
          {selectedLesson?<>
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
          </>:<div className="text-sm text-slate-500">Select a lesson to inspect its objectives, authored content, takeaways, and review status.</div>}
        </Card>
      </div>}

      {tab==="modules"&&<Card className="mt-5 overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Level</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">TOS Weight</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{modules.map(m=><tr key={m.id}><td className="px-4 py-3">{m.exam_level}</td><td className="px-4 py-3 font-medium">{m.title}</td><td className="px-4 py-3">{m.tos_weight??"—"}%</td><td className="px-4 py-3"><select disabled={role!=="admin"} value={m.status} onChange={e=>updateStatus("modules",m.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody>
      </table></div></Card>}

      {tab==="questions"&&<div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        {role==="admin"&&<Card>
          <div className="flex items-center gap-2"><Plus size={18} className="text-indigo-600"/><h2 className="text-lg font-bold">Author Question</h2></div>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">Module
              <select value={questionForm.module_id} onChange={e=>setQuestionForm({...questionForm,module_id:e.target.value,lesson_id:"",competency_id:""})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">
                <option value="">Select module</option>{modules.filter(m=>m.exam_area==="Professional Education").map(m=><option key={m.id} value={m.id}>{m.exam_level} — {m.title}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Competency
              <select value={questionForm.competency_id} onChange={e=>{const c=competencies.find(x=>x.id===e.target.value);setQuestionForm({...questionForm,competency_id:e.target.value,source_id:c?.official_source_id||questionForm.source_id})}} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">
                <option value="">Select competency</option>{questionCompetencies.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Lesson (optional)
              <select value={questionForm.lesson_id} onChange={e=>setQuestionForm({...questionForm,lesson_id:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">
                <option value="">No specific lesson</option>{questionLessons.map(l=><option key={l.id} value={l.id}>{l.sequence}. {l.title}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Source
              <select value={questionForm.source_id} onChange={e=>setQuestionForm({...questionForm,source_id:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">
                <option value="">Use competency official source</option>{sources.map(s=><option key={s.id} value={s.id}>{s.organization} — {s.document_title}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Question<textarea value={questionForm.question} onChange={e=>setQuestionForm({...questionForm,question:e.target.value})} rows={4} className="mt-2 w-full rounded-xl border px-3 py-2 font-normal"/></label>
            {(["a","b","c","d"] as const).map(k=><label key={k} className="text-sm font-semibold">Choice {k.toUpperCase()}<input value={(questionForm as any)["choice_"+k]} onChange={e=>setQuestionForm({...questionForm,["choice_"+k]:e.target.value})} className="mt-2 w-full rounded-xl border px-3 py-2 font-normal"/></label>)}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold">Correct Answer<select value={questionForm.correct_answer} onChange={e=>setQuestionForm({...questionForm,correct_answer:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">{["A","B","C","D"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="text-sm font-semibold">Bloom Level<select value={questionForm.bloom_level} onChange={e=>setQuestionForm({...questionForm,bloom_level:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">{["Remember","Understand","Apply","Analyze","Evaluate"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="text-sm font-semibold">Difficulty<select value={questionForm.difficulty} onChange={e=>setQuestionForm({...questionForm,difficulty:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">{["easy","moderate","difficult"].map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <label className="text-sm font-semibold">Main Rationale<textarea value={questionForm.rationale} onChange={e=>setQuestionForm({...questionForm,rationale:e.target.value})} rows={4} className="mt-2 w-full rounded-xl border px-3 py-2 font-normal"/></label>
            <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Optional rationale for each choice</summary><div className="mt-4 grid gap-3">{(["a","b","c","d"] as const).map(k=><label key={k} className="text-xs font-semibold">Choice {k.toUpperCase()} explanation<textarea value={(questionForm as any)["rationale_"+k]} onChange={e=>setQuestionForm({...questionForm,["rationale_"+k]:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>)}</div></details>
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} onClick={()=>createQuestion("draft")} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Save Draft</button>
              <button disabled={saving} onClick={()=>createQuestion("for_review")} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">{saving?"Saving...":"Submit for Review"}</button>
            </div>
          </div>
        </Card>}

        <Card className="overflow-hidden p-0">
          <div className="border-b p-4"><h2 className="font-bold">Question Review Queue</h2></div>
          {questions.length?<div className="max-h-[900px] divide-y overflow-auto">{questions.map(q=><div key={q.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-3xl"><div className="text-xs font-semibold uppercase text-indigo-600">{q.exam_area} • {q.modules?.title||"Unassigned"}</div><div className="mt-2 text-sm font-medium leading-6">{q.question}</div></div><select disabled={role!=="admin"} value={q.review_status} onChange={e=>updateQuestion(q.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>:<div className="p-6 text-sm text-slate-500">No authored questions are in the review queue yet.</div>}
        </Card>
      </div>}

      {tab==="flashcards"&&<div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        {role==="admin"&&<Card>
          <div className="flex items-center gap-2"><Plus size={18} className="text-indigo-600"/><h2 className="text-lg font-bold">Author Flashcard</h2></div>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">Module<select value={flashcardForm.module_id} onChange={e=>setFlashcardForm({...flashcardForm,module_id:e.target.value,lesson_id:"",competency_id:""})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal"><option value="">Select module</option>{modules.filter(m=>m.exam_area==="Professional Education").map(m=><option key={m.id} value={m.id}>{m.exam_level} — {m.title}</option>)}</select></label>
            <label className="text-sm font-semibold">Competency<select value={flashcardForm.competency_id} onChange={e=>{const c=competencies.find(x=>x.id===e.target.value);setFlashcardForm({...flashcardForm,competency_id:e.target.value,source_id:c?.official_source_id||flashcardForm.source_id})}} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal"><option value="">Select competency</option>{flashcardCompetencies.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</select></label>
            <label className="text-sm font-semibold">Lesson (optional)<select value={flashcardForm.lesson_id} onChange={e=>setFlashcardForm({...flashcardForm,lesson_id:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal"><option value="">No specific lesson</option>{flashcardLessons.map(l=><option key={l.id} value={l.id}>{l.sequence}. {l.title}</option>)}</select></label>
            <label className="text-sm font-semibold">Card Type<select value={flashcardForm.card_type} onChange={e=>setFlashcardForm({...flashcardForm,card_type:e.target.value})} className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-normal">{["concept","definition","application","misconception"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="text-sm font-semibold">Front<textarea value={flashcardForm.front} onChange={e=>setFlashcardForm({...flashcardForm,front:e.target.value})} rows={3} className="mt-2 w-full rounded-xl border px-3 py-2 font-normal"/></label>
            <label className="text-sm font-semibold">Back<textarea value={flashcardForm.back} onChange={e=>setFlashcardForm({...flashcardForm,back:e.target.value})} rows={5} className="mt-2 w-full rounded-xl border px-3 py-2 font-normal"/></label>
            <div className="flex flex-wrap gap-3"><button disabled={saving} onClick={()=>createFlashcard("draft")} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">Save Draft</button><button disabled={saving} onClick={()=>createFlashcard("for_review")} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Submit for Review</button></div>
          </div>
        </Card>}

        <Card className="overflow-hidden p-0">
          <div className="border-b p-4"><h2 className="font-bold">Flashcard Review Queue</h2></div>
          {flashcards.length?<div className="max-h-[800px] divide-y overflow-auto">{flashcards.map(f=><div key={f.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase text-indigo-600">{f.modules?.title||"Unassigned"}</div><div className="mt-2 font-semibold">{f.front}</div><div className="mt-1 text-sm leading-6 text-slate-500">{f.back}</div></div><select disabled={role!=="admin"} value={f.status} onChange={e=>updateStatus("flashcards",f.id,e.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs disabled:bg-slate-100">{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>:<div className="p-6 text-sm text-slate-500">No authored flashcards are in the review queue yet.</div>}
        </Card>
      </div>}
    </div>
  </AppShell>;
}
