"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, Circle, Clock3, LockKeyhole, RotateCcw, Trophy } from "lucide-react";

type ModuleRow={id:string;title:string;description:string|null;exam_area:string;estimated_minutes:number|null;tos_weight:number|null};
type LessonRow={id:string;title:string;sequence:number;learning_objectives:any;content:any;key_takeaways:any;estimated_minutes:number|null};
type ProgressRow={lesson_id:string;status:string;progress_percent:number;completed_at:string|null};
type Question={q:string;choices:string[];answer:number;why:string;lesson:number};

const RIZAL_QUIZ:Question[]=[
 {q:"A learner says Rizal's reform ideas can be understood without studying nineteenth-century colonial conditions. Which response is most accurate?",choices:["Agree, because his ideas were purely personal","Disagree, because his writings responded to concrete social and colonial conditions","Agree, because European events had no influence on him","Disagree, because Rizal rejected education abroad"],answer:1,why:"Rizal's reform thought developed in a historical setting shaped by colonial institutions, education, social inequality, and wider intellectual currents.",lesson:1},
 {q:"Which best explains the importance of Rizal's education and travels to his reform work?",choices:["They isolated him from Philippine concerns","They exposed him to wider intellectual currents that informed his analysis of Philippine conditions","They caused him to abandon writing as a means of reform","They made him a military leader of the Katipunan"],answer:1,why:"His studies and travels widened his intellectual perspective and strengthened his use of scholarship and writing in reform advocacy.",lesson:2},
 {q:"A teacher wants students to understand Noli Me Tangere beyond memorizing characters. Which task best fits that goal?",choices:["List characters alphabetically","Memorize every chapter title","Analyze how a conflict in the novel represents a colonial social problem","Copy the novel's publication details repeatedly"],answer:2,why:"Noli is important as social criticism; analysis should connect characters and conflicts with institutions and social conditions.",lesson:3},
 {q:"Which interpretation best distinguishes El Filibusterismo from a simplistic endorsement of violent revolution?",choices:["Simoun's plan succeeds and is celebrated","The novel ignores the consequences of vengeance","The failure and consequences of Simoun's strategy invite ethical and political reflection","Rizal removed all discussion of reform"],answer:2,why:"The darker novel explores radicalization and injustice, but the consequences of Simoun's strategy make simple endorsement an inaccurate reading.",lesson:4},
 {q:"Which activity during Rizal's Dapitan exile best supports the view that his nationalism included civic service?",choices:["Community, educational, scientific, and medical work","Commanding a revolutionary army","Serving as governor-general","Writing Spanish military orders"],answer:0,why:"Rizal's Dapitan years included medicine, teaching, scientific interests, and community improvement.",lesson:5},
 {q:"Which statement best describes Rizal's relationship to other Filipino heroes?",choices:["Other heroes merely followed orders from Rizal","Rizal influenced national consciousness, while other heroes retained their own ideas and agency","Rizal and Bonifacio used exactly the same political strategy","The Propaganda Movement depended entirely on Rizal alone"],answer:1,why:"Rizal was influential, but figures such as Bonifacio, del Pilar, López Jaena, and others had distinct roles, ideas, and strategies.",lesson:6},
 {q:"Why is historical context essential when interpreting Rizal's novels?",choices:["It replaces the need to read themes","It connects literary criticism to the institutions and conditions being criticized","It proves every fictional event occurred exactly as written","It makes character analysis unnecessary"],answer:1,why:"Context helps explain the social institutions, inequalities, and reform concerns represented through fiction.",lesson:1},
 {q:"Which method is most closely associated with Rizal's contribution to the reform campaign?",choices:["Scholarship, essays, correspondence, and literature","Direct command of Katipunan military units","Service as Spanish governor-general","Armed occupation of colonial offices"],answer:0,why:"Rizal's influence in the reform campaign was especially associated with scholarship, writing, civic thought, and advocacy.",lesson:2},
 {q:"A question asks what Noli Me Tangere contributed to Filipino national consciousness. Which answer is strongest?",choices:["It provided a military battle plan","It made social abuses and institutional problems visible through influential social criticism","It abolished colonial government immediately","It established the First Philippine Republic"],answer:1,why:"The novel helped expose social problems and contributed to reform discourse and developing national consciousness.",lesson:3},
 {q:"What does Simoun's transformation from Crisostomo Ibarra most clearly allow readers to examine?",choices:["The effects of frustration, oppression, vengeance, and radicalization","The success of colonial education policy","The disappearance of social inequality","The rejection of all political questions"],answer:0,why:"Simoun's transformation is central to the novel's darker exploration of failed reform, radicalization, and consequences.",lesson:4},
 {q:"Why did Rizal's execution strengthen his national symbolism?",choices:["It erased public interest in his writings","It linked his ideas and civic example with sacrifice under colonial rule","It proved he commanded the revolution","It ended debates about Philippine nationhood"],answer:1,why:"His death intensified the symbolic power of his writings, civic example, sacrifice, and the perceived injustice of colonial rule.",lesson:5},
 {q:"Which comparison between Rizal and Bonifacio is most defensible?",choices:["They had identical methods and organizations","Rizal's reform advocacy and Bonifacio's revolutionary strategy differed, although both became important to Filipino nationalism","Bonifacio wrote Noli while Rizal founded the Katipunan","Neither influenced nationalist consciousness"],answer:1,why:"Their methods and roles differed. Recognizing both influence and difference avoids collapsing Philippine nationalism into a single strategy.",lesson:6},
 {q:"Republic Act No. 1425 primarily requires schools to include courses concerning which subject?",choices:["Only the military history of 1896","The life, works, and writings of José Rizal, particularly Noli Me Tangere and El Filibusterismo","Only biographies of Spanish governors","The complete works of all Propaganda Movement writers"],answer:1,why:"RA 1425 requires courses on Rizal's life, works, and writings, particularly his two novels.",lesson:6},
 {q:"Which pair correctly matches Rizal's two novels with their publication years?",choices:["Noli—1887; Fili—1891","Noli—1891; Fili—1887","Noli—1896; Fili—1898","Noli—1872; Fili—1892"],answer:0,why:"NHCP historical markers identify Noli Me Tangere with 1887 and El Filibusterismo with 1891.",lesson:3},
 {q:"Which approach best demonstrates the official LEPT outcome of analyzing Rizal's influence on the nation?",choices:["Memorizing his birth date only","Explaining how his writings, civic example, and martyrdom affected national consciousness while considering historical context","Listing every city he visited without interpretation","Treating every later revolutionary action as Rizal's direct instruction"],answer:1,why:"The outcome emphasizes analysis of influence, which requires connecting his works and example to national consciousness rather than isolated recall.",lesson:6}
];

function normalizeList(v:any):string[]{return Array.isArray(v)?v.map(x=>typeof x==="string"?x:JSON.stringify(x)):[]}
function ContentBlock({content}:{content:any}){
 if(!content)return null;if(typeof content==="string")return <p className="leading-7 text-slate-700">{content}</p>;
 if(Array.isArray(content))return <div className="space-y-3">{content.map((x,i)=><ContentBlock key={i} content={x}/>)}</div>;
 if(typeof content==="object")return <div className="space-y-5">{Object.entries(content).map(([k,v])=><section key={k}><h4 className="font-semibold capitalize text-slate-900">{k.replaceAll("_"," ")}</h4><div className="mt-2 text-sm">{Array.isArray(v)?<ul className="list-disc space-y-2 pl-5 text-slate-700">{v.map((x:any,i:number)=><li key={i}>{typeof x==="string"?x:JSON.stringify(x)}</li>)}</ul>:<ContentBlock content={v}/>}</div></section>)}</div>;
 return null;
}

export default function ModuleReader(){
 const params=useParams<{moduleId:string}>(),moduleId=params.moduleId,supabase=createClient();
 const [module,setModule]=useState<ModuleRow|null>(null),[lessons,setLessons]=useState<LessonRow[]>([]),[progress,setProgress]=useState<ProgressRow[]>([]);
 const [activeLesson,setActiveLesson]=useState<string|null>(null),[signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [quizOpen,setQuizOpen]=useState(false),[answers,setAnswers]=useState<Record<number,number>>({}),[submitted,setSubmitted]=useState(false);

 useEffect(()=>{load()},[moduleId]);
 async function load(){
  setLoading(true);const {data:{user}}=await supabase.auth.getUser();setSignedIn(!!user);
  const [mr,lr]=await Promise.all([
   supabase.from("modules").select("id,title,description,exam_area,estimated_minutes,tos_weight").eq("id",moduleId).eq("status","published").maybeSingle(),
   supabase.from("lessons").select("id,title,sequence,learning_objectives,content,key_takeaways,estimated_minutes").eq("module_id",moduleId).eq("status","published").order("sequence")
  ]);
  setModule(mr.data as ModuleRow|null);const rows=(lr.data??[]) as LessonRow[];setLessons(rows);setActiveLesson(rows[0]?.id??null);
  if(user&&rows.length){const {data}=await supabase.from("lesson_progress").select("lesson_id,status,progress_percent,completed_at").eq("user_id",user.id).in("lesson_id",rows.map(x=>x.id));setProgress((data??[]) as ProgressRow[])}
  setLoading(false);
 }
 const progressMap=useMemo(()=>new Map(progress.map(x=>[x.lesson_id,x])),[progress]);
 const current=lessons.find(x=>x.id===activeLesson)??lessons[0];
 const allDone=lessons.length>0&&lessons.every(x=>!!progressMap.get(x.id)?.completed_at);
 const isRizal=module?.title==="The Life and Works of Rizal";
 const score=submitted?RIZAL_QUIZ.reduce((n,q,i)=>n+(answers[i]===q.answer?1:0),0):0;

 async function markComplete(id:string){
  const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Sign in to save lesson completion.");return}
  const now=new Date().toISOString();const {error}=await supabase.from("lesson_progress").upsert({user_id:user.id,lesson_id:id,status:"completed",progress_percent:100,completed_at:now,updated_at:now},{onConflict:"user_id,lesson_id"});
  if(error){setMessage(error.message);return}
  setProgress(p=>[...p.filter(x=>x.lesson_id!==id),{lesson_id:id,status:"completed",progress_percent:100,completed_at:now}]);setMessage("Lesson completed. Continue to the next lesson.");
 }
 if(loading)return <AppShell><div className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading module...</div></AppShell>;
 if(!module)return <AppShell><div className="mx-auto max-w-5xl p-8"><Link href="/study" className="text-sm font-semibold text-indigo-700">← Back</Link><Card className="mt-6">Module unavailable.</Card></div></AppShell>;

 return <AppShell><div className="mx-auto max-w-7xl p-5 sm:p-8">
  <Link href="/study" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Back to learning path</Link>
  <div className="mt-5"><p className="text-sm font-semibold text-indigo-700">{module.exam_area}</p><h1 className="mt-1 text-3xl font-bold">{module.title}</h1>{module.description&&<p className="mt-2 max-w-3xl leading-7 text-slate-500">{module.description}</p>}<div className="mt-3 flex gap-4 text-xs text-slate-500">{module.tos_weight&&<span>TOS weight {module.tos_weight}%</span>}<span>{lessons.length} lessons</span>{isRizal&&<span>15-item module assessment</span>}</div></div>
  {message&&<div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}
  {!signedIn&&<div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sign in to save lesson completion and unlock assessments.</div>}

  <div className="mt-7 grid gap-6 lg:grid-cols-[300px_1fr]">
   <Card className="h-fit p-3"><div className="px-2 pb-3 pt-1 text-sm font-bold">Module Journey</div><div className="space-y-1">{lessons.map(l=>{const done=!!progressMap.get(l.id)?.completed_at;return <button key={l.id} onClick={()=>{setQuizOpen(false);setActiveLesson(l.id)}} className={"flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm "+(activeLesson===l.id&&!quizOpen?"bg-indigo-50 text-indigo-800":"hover:bg-slate-50")}>{done?<CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/>:<Circle size={17} className="mt-0.5 shrink-0 text-slate-300"/>}<span><span className="block text-xs text-slate-400">Lesson {l.sequence}</span><span className="font-medium">{l.title}</span></span></button>})}</div>
    {isRizal&&<button disabled={!allDone} onClick={()=>setQuizOpen(true)} className={"mt-3 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold "+(allDone?"border-indigo-200 bg-indigo-50 text-indigo-800":"bg-slate-50 text-slate-400")} >{allDone?<Trophy size={18}/>:<LockKeyhole size={18}/>}<span>Module Assessment<span className="block text-xs font-normal">15 LEPT-style items</span></span></button>}
   </Card>

   {!quizOpen&&current?<Card className="p-6 sm:p-8"><div className="flex justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Lesson {current.sequence}</div><h2 className="mt-2 text-2xl font-bold">{current.title}</h2></div>{current.estimated_minutes&&<div className="inline-flex items-center gap-2 text-sm text-slate-500"><Clock3 size={16}/>{current.estimated_minutes} min</div>}</div>
    {normalizeList(current.learning_objectives).length>0&&<section className="mt-7"><h3 className="text-lg font-bold">Learning Objectives</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{normalizeList(current.learning_objectives).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
    <section className="mt-7"><h3 className="text-lg font-bold">Lesson</h3><div className="mt-4"><ContentBlock content={current.content}/></div></section>
    {normalizeList(current.key_takeaways).length>0&&<section className="mt-7 rounded-2xl bg-slate-50 p-5"><h3 className="font-bold">Key Takeaways</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{normalizeList(current.key_takeaways).map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
    <div className="mt-8 flex justify-end"><button disabled={!!progressMap.get(current.id)?.completed_at} onClick={()=>markComplete(current.id)} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-emerald-600">{progressMap.get(current.id)?.completed_at?"Completed":"Mark Lesson Complete"}</button></div>
   </Card>:quizOpen&&isRizal?<Card className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Module Assessment</div><h2 className="mt-2 text-2xl font-bold">Life and Works of Rizal</h2><p className="mt-2 text-sm text-slate-500">Choose the best answer. Questions emphasize interpretation, application, and analysis rather than isolated recall.</p></div>{submitted&&<div className="rounded-2xl bg-indigo-50 px-5 py-3 text-center"><div className="text-2xl font-bold text-indigo-700">{score}/15</div><div className="text-xs text-slate-500">{Math.round(score/15*100)}%</div></div>}</div>
    <div className="mt-7 space-y-7">{RIZAL_QUIZ.map((q,i)=><div key={i} className="border-b pb-7 last:border-0"><p className="font-semibold leading-6">{i+1}. {q.q}</p><div className="mt-3 grid gap-2">{q.choices.map((ch,j)=>{const chosen=answers[i]===j,correct=q.answer===j;return <button disabled={submitted} key={j} onClick={()=>setAnswers(a=>({...a,[i]:j}))} className={"rounded-xl border px-4 py-3 text-left text-sm "+(submitted&&correct?"border-emerald-400 bg-emerald-50":submitted&&chosen&&!correct?"border-rose-300 bg-rose-50":chosen?"border-indigo-500 bg-indigo-50":"hover:bg-slate-50")}><b className="mr-2">{String.fromCharCode(65+j)}.</b>{ch}</button>})}</div>{submitted&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><b>Why:</b> {q.why}{answers[i]!==q.answer&&<button onClick={()=>{setQuizOpen(false);setActiveLesson(lessons.find(l=>l.sequence===q.lesson)?.id??null)}} className="ml-2 font-semibold text-indigo-700 underline">Review Lesson {q.lesson}</button>}</div>}</div>)}</div>
    {!submitted?<button disabled={Object.keys(answers).length!==15} onClick={()=>setSubmitted(true)} className="mt-4 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300">Submit Assessment</button>:<div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>{setAnswers({});setSubmitted(false);window.scrollTo({top:0,behavior:"smooth"})}} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"><RotateCcw size={16}/> Retake</button><Link href="/study" className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Continue Learning Path</Link></div>}
   </Card>:<Card>No published lessons are available.</Card>}
  </div>
 </div></AppShell>;
}
