"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, RotateCcw, Target, Trophy } from "lucide-react";

type QuestionRow={
  session_id:string;sequence:number;id:string;question:string;
  choice_a:string;choice_b:string;choice_c:string;choice_d:string;
  exam_area:string;lesson_id:string|null;difficulty:string|null;bloom_level:string|null;
};
type ResultRow={
  session_id:string;module_id:string;score_percent:number;total_questions:number;correct_answers:number;
  by_lesson:{lesson_id:string|null;sequence:number|null;title:string|null;total:number;correct:number;accuracy:number}[];
  wrong_items:{sequence:number;question_id:string;lesson_id:string|null;lesson_title:string|null;question:string;correct_answer:string;rationale:string;selected_answer:string|null}[];
};

export default function ModuleAssessmentPage(){
  const {moduleId}=useParams<{moduleId:string}>();
  const supabase=createClient();
  const [moduleTitle,setModuleTitle]=useState("Module Assessment");
  const [questions,setQuestions]=useState<QuestionRow[]>([]);
  const [index,setIndex]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  const [sessionId,setSessionId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [message,setMessage]=useState("");
  const [result,setResult]=useState<ResultRow|null>(null);

  useEffect(()=>{load();},[moduleId]);

  async function load(){
    setLoading(true);
    const {data:m}=await supabase.from("modules").select("title").eq("id",moduleId).maybeSingle();
    if(m?.title)setModuleTitle(m.title);
    setLoading(false);
  }

  async function start(){
    setLoading(true);setMessage("");setResult(null);setQuestions([]);setIndex(0);setSelected(null);
    const {data,error}=await supabase.rpc("start_module_assessment",{p_module_id:moduleId,p_limit:20});
    setLoading(false);
    if(error){setMessage(error.message);return}
    const rows=(data??[]) as QuestionRow[];
    if(!rows.length){setMessage("No assessment questions are available yet.");return}
    setSessionId(rows[0].session_id);
    setQuestions(rows);
  }

  async function submitAnswer(){
    if(selected===null||!questions[index]||!sessionId)return;
    setSubmitting(true);setMessage("");
    const q=questions[index];
    const {error}=await supabase.rpc("submit_module_assessment_answer",{
      p_session_id:sessionId,
      p_question_id:q.id,
      p_selected_answer:String.fromCharCode(65+selected),
      p_duration_seconds:null
    });
    if(error){setMessage(error.message);setSubmitting(false);return}

    if(index>=questions.length-1){
      const {data,error:finalError}=await supabase.rpc("finalize_module_assessment",{p_session_id:sessionId});
      setSubmitting(false);
      if(finalError){setMessage(finalError.message);return}
      setResult(data as ResultRow);
      setQuestions([]);
      return;
    }

    setIndex(i=>i+1);setSelected(null);setSubmitting(false);
  }

  if(loading)return <AppShell><div className="mx-auto max-w-4xl p-8 text-sm text-slate-500">Preparing module assessment...</div></AppShell>;

  if(result)return <AppShell><div className="mx-auto max-w-5xl p-5 sm:p-8">
    <Link href={"/study/"+moduleId} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Back to module</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-indigo-700">Module Assessment Results</p><h1 className="mt-1 text-3xl font-bold">{moduleTitle}</h1></div>
      <div className="rounded-2xl bg-indigo-50 px-6 py-4 text-center"><div className="text-3xl font-bold text-indigo-700">{Math.round(Number(result.score_percent))}%</div><div className="text-xs text-slate-500">{result.correct_answers}/{result.total_questions} correct</div></div>
    </div>

    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.8fr]">
      <Card>
        <h2 className="text-lg font-bold">Performance by Lesson</h2>
        <div className="mt-4 space-y-4">{(result.by_lesson??[]).map((x,i)=><div key={x.lesson_id??i}>
          <div className="flex justify-between gap-3 text-sm"><span>{x.title||"Unassigned lesson"}</span><b>{Math.round(Number(x.accuracy))}%</b></div>
          <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{width:Math.max(0,Math.min(100,Number(x.accuracy)))+"%"}}/></div>
          <div className="mt-1 text-xs text-slate-500">{x.correct}/{x.total} correct</div>
        </div>)}</div>
      </Card>

      <Card>
        <Trophy className="text-indigo-600"/>
        <h2 className="mt-3 text-lg font-bold">Recommended Next Step</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{(result.wrong_items??[]).length
          ? "Review the lessons linked to missed questions, then retry them from My Mistakes."
          : "Excellent result. Continue to the next module and keep the flashcards in your review queue."}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/mistakes" className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Review Mistakes</Link>
          <Link href="/progress" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">View Progress</Link>
        </div>
      </Card>
    </div>

    {(result.wrong_items??[]).length>0&&<Card className="mt-5">
      <h2 className="text-lg font-bold">Questions to Review</h2>
      <div className="mt-4 space-y-4">{result.wrong_items.map(x=><div key={x.question_id} className="border-b pb-4 last:border-0">
        <div className="text-sm font-semibold leading-6">{x.sequence}. {x.question}</div>
        <div className="mt-2 text-xs text-slate-500">Your answer: {x.selected_answer||"—"} • Correct: {x.correct_answer}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{x.rationale}</p>
        {x.lesson_id&&<Link href={"/study/"+moduleId+"?lesson="+x.lesson_id} className="mt-2 inline-block text-sm font-semibold text-indigo-700">Review {x.lesson_title||"lesson"}</Link>}
      </div>)}</div>
    </Card>}

    <div className="mt-6"><Link href="/study" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"><CheckCircle2 size={16}/> Continue Learning Path</Link></div>
  </div></AppShell>;

  if(!questions.length)return <AppShell><div className="mx-auto max-w-4xl p-5 sm:p-8">
    <Link href={"/study/"+moduleId} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Back to module</Link>
    <Card className="mt-6">
      <Target className="text-indigo-600"/>
      <p className="mt-4 text-sm font-semibold text-indigo-700">Module Assessment</p>
      <h1 className="mt-1 text-3xl font-bold">{moduleTitle}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">This assessment uses reviewed and published four-choice LEPT-style questions. The set targets approximately 30% easy, 50% moderate, and 20% difficult items. Answers are withheld until the assessment is completed.</p>
      {message&&<div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">{message}</div>}
      <button onClick={start} className="mt-6 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white">Start 20-Item Assessment</button>
    </Card>
  </div></AppShell>;

  const q=questions[index];
  return <AppShell><div className="mx-auto max-w-3xl p-5 sm:p-8">
    <div className="flex items-center justify-between text-sm"><span className="font-semibold">{moduleTitle}</span><span className="text-slate-500">Question {index+1} of {questions.length}</span></div>
    <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-600" style={{width:((index)/questions.length*100)+"%"}}/></div>
    <Card className="mt-6">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>{q.difficulty}</span>{q.bloom_level&&<span>• {q.bloom_level}</span>}</div>
      <h1 className="mt-3 text-xl font-bold leading-8">{q.question}</h1>
      <div className="mt-5 grid gap-3">{[q.choice_a,q.choice_b,q.choice_c,q.choice_d].map((choice,i)=><button key={i} onClick={()=>setSelected(i)} className={"rounded-xl border px-4 py-3 text-left text-sm "+(selected===i?"border-indigo-500 bg-indigo-50":"hover:bg-slate-50")}>
        <b className="mr-2">{String.fromCharCode(65+i)}.</b>{choice}
      </button>)}</div>
      {message&&<div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</div>}
      <div className="mt-6 flex justify-end"><button disabled={selected===null||submitting} onClick={submitAnswer} className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{submitting?"Submitting...":index===questions.length-1?"Finish Assessment":"Submit & Continue"}</button></div>
    </Card>
  </div></AppShell>;
}
