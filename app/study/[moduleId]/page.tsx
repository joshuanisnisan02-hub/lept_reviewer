"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Brain, CheckCircle2, Circle, Clock3, Highlighter, LockKeyhole, RotateCcw, Save, StickyNote, Target, Trash2, Trophy } from "lucide-react";

type ModuleRow={id:string;title:string;description:string|null;exam_area:string;estimated_minutes:number|null;tos_weight:number|null};
type LessonRow={id:string;title:string;sequence:number;learning_objectives:any;content:any;key_takeaways:any;key_terms:any;estimated_minutes:number|null};
type HighlightRow={id:string;lesson_id:string;selected_text:string;color:"yellow"|"green"|"blue"|"pink";created_at:string};
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

const LESSON_ORDER=[
 "exam_coverage","overview","must_know","core_discussion","principles","reading_skills","source_use","argumentation",
 "purpose_audience_context","tone_and_register","formats","email_structure","special_purpose_principles","audience_adaptation",
 "evaluation_questions","fact_opinion_inference","digital_communication","process_flow","format_guide","message_checklist","audience_matrix","source_check","argument_check","before_after","timeline","chronology","key_dates","worked_examples",
 "worked_example","examples","example","compare_and_distinguish","review_checklist","common_exam_trap","common_mistakes","lept_focus","exam_strategy"
];

const SECTION_TITLES:Record<string,string>={
 exam_coverage:"EXAM COVERAGE",
 overview:"OVERVIEW",
 must_know:"MUST KNOW",
 core_discussion:"CORE REVIEW",
 principles:"CORE PRINCIPLES",
 reading_skills:"READING SKILLS TO MASTER",
 source_use:"USING SOURCES",
 argumentation:"ARGUMENT AND EVIDENCE",
 purpose_audience_context:"PURPOSE, AUDIENCE, AND CONTEXT",
 tone_and_register:"TONE AND REGISTER",
 formats:"PROFESSIONAL FORMATS",
 email_structure:"EFFECTIVE EMAIL STRUCTURE",
 special_purpose_principles:"TECHNICAL COMMUNICATION",
 audience_adaptation:"ADAPTING TO THE AUDIENCE",
 evaluation_questions:"QUESTIONS TO ASK",
 fact_opinion_inference:"FACT vs OPINION vs INFERENCE",
 digital_communication:"DIGITAL COMMUNICATION",
 process_flow:"PROCESS / FLOW TO REMEMBER",
 format_guide:"FORMAT GUIDE",
 message_checklist:"EXAM CHECKLIST",
 audience_matrix:"AUDIENCE GUIDE",
 source_check:"SOURCE CHECK",
 argument_check:"ARGUMENT CHECK",
 before_after:"BEFORE vs BETTER",
 review_checklist:"SELF-CHECK BEFORE MOVING ON",
 timeline:"TIMELINE",
 chronology:"CHRONOLOGY",
 key_dates:"KEY DATES",
 worked_examples:"EXAMPLES / APPLICATION",
 worked_example:"EXAMPLE / APPLICATION",
 examples:"EXAMPLES / APPLICATION",
 example:"EXAMPLE / APPLICATION",
 compare_and_distinguish:"DO NOT CONFUSE",
 common_exam_trap:"COMMON EXAM TRAPS",
 common_mistakes:"COMMON EXAM TRAPS",
 lept_focus:"LEPT FOCUS",
 exam_strategy:"HOW TO ANSWER"
};

const HIGHLIGHT_CLASS:Record<string,string>={
 yellow:"bg-yellow-200/80",
 green:"bg-emerald-200/80",
 blue:"bg-sky-200/80",
 pink:"bg-pink-200/80"
};

function HighlightedText({text,highlights}:{text:string;highlights:HighlightRow[]}){
 const hits=highlights.filter(h=>h.selected_text&&text.includes(h.selected_text)).sort((a,b)=>b.selected_text.length-a.selected_text.length);
 if(!hits.length)return <>{text}</>;
 let parts:{text:string;color?:string;id?:string}[]=[{text}];
 for(const h of hits){
  const next:{text:string;color?:string;id?:string}[]=[];
  for(const p of parts){
   if(p.color){next.push(p);continue}
   const chunks=p.text.split(h.selected_text);
   chunks.forEach((chunk,i)=>{if(chunk)next.push({text:chunk});if(i<chunks.length-1)next.push({text:h.selected_text,color:h.color,id:h.id})});
  }
  parts=next;
 }
 return <>{parts.map((p,i)=>p.color?<mark key={(p.id??"h")+i} className={"rounded-sm px-0.5 "+HIGHLIGHT_CLASS[p.color]}>{p.text}</mark>:<span key={"t"+i}>{p.text}</span>)}</>;
}

function BoldLead({text,highlights}:{text:string;highlights:HighlightRow[]}){
 const idx=text.indexOf(":");
 if(idx>0&&idx<48){
  return <><strong className="font-bold text-slate-950"><HighlightedText text={text.slice(0,idx+1)} highlights={highlights}/></strong>{" "}<HighlightedText text={text.slice(idx+1).trim()} highlights={highlights}/></>;
 }
 return <HighlightedText text={text} highlights={highlights}/>;
}

function CompactTable({rows,highlights}:{rows:any[];highlights:HighlightRow[]}){
 if(!rows.length)return null;
 const first=rows[0];
 if(!first||typeof first!=="object"||Array.isArray(first))return null;
 const keys=Object.keys(first);
 return <div className="overflow-x-auto">
  <table className="w-full border-collapse text-[13px] leading-5">
   <thead><tr>{keys.map(k=><th key={k} className="border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-bold capitalize">{k.replaceAll("_"," ")}</th>)}</tr></thead>
   <tbody>{rows.map((row,i)=><tr key={i}>{keys.map(k=><td key={k} className="border border-slate-400 px-2 py-1.5 align-top"><HighlightedText text={String(row[k]??"")} highlights={highlights}/></td>)}</tr>)}</tbody>
  </table>
 </div>;
}

function ReviewerValue({value,highlights,depth=0}:{value:any;highlights:HighlightRow[];depth?:number}){
 if(value==null)return null;
 if(typeof value==="string")return <p className="text-[14px] leading-6 text-slate-900"><BoldLead text={value} highlights={highlights}/></p>;
 if(Array.isArray(value)){
  if(value.length&&typeof value[0]==="object"&&!Array.isArray(value[0]))return <CompactTable rows={value} highlights={highlights}/>;
  return <ul className="space-y-1.5 pl-5 text-[14px] leading-6 text-slate-900">{value.map((x,i)=><li key={i} className="list-disc"><BoldLead text={typeof x==="string"?x:JSON.stringify(x)} highlights={highlights}/></li>)}</ul>;
 }
 if(typeof value==="object")return <div className={depth===0?"space-y-3":"space-y-2"}>{Object.entries(value).map(([k,v])=><div key={k} className={depth===0?"break-inside-avoid":""}><div className={depth===0?"mb-1 text-[14px] font-extrabold underline decoration-slate-400 underline-offset-2 text-slate-950":"mb-1 text-[13px] font-bold text-slate-800"}>{k.replaceAll("_"," ")}</div><ReviewerValue value={v} highlights={highlights} depth={depth+1}/></div>)}</div>;
 return null;
}

function ReviewerSection({name,value,highlights}:{name:string;value:any;highlights:HighlightRow[]}){
 const title=SECTION_TITLES[name]??name.replaceAll("_"," ").toUpperCase();
 const isTrap=name==="common_exam_trap"||name==="common_mistakes";
 const isFocus=name==="lept_focus"||name==="exam_strategy";
 return <section className={"mb-5 break-inside-avoid "+(isTrap||isFocus?"border-l-4 pl-3 ":"")+(isTrap?"border-amber-500":isFocus?"border-indigo-600":"")}>
  <h3 className="mb-2 text-[15px] font-extrabold tracking-tight text-slate-950 underline decoration-slate-400 underline-offset-4">{title}</h3>
  <ReviewerValue value={value} highlights={highlights}/>
 </section>;
}

function StudyOutline({items,highlights}:{items:any[];highlights:HighlightRow[]}){
 if(!Array.isArray(items)||!items.length)return null;
 return <div className="columns-1 gap-10 xl:columns-2 [column-fill:balance]">
  {items.map((section:any,i:number)=>{
    const rows=Array.isArray(section?.items)?section.items:[];
    if(!rows.length)return null;
    return <section key={i} className="mb-7 break-inside-avoid">
      <h3 className="text-[16px] font-extrabold uppercase tracking-tight text-slate-950">{section.title}</h3>
      {section.subtitle&&<div className="mb-2 mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{section.subtitle}</div>}
      <div className="mt-2">
        <ReviewerValue value={rows} highlights={highlights}/>
      </div>
    </section>;
  })}
 </div>;
}

function ExamLesson({content,highlights}:{content:any;highlights:HighlightRow[]}){
 if(!content)return null;
 if(typeof content!=="object"||Array.isArray(content))return <ReviewerValue value={content} highlights={highlights}/>;

 const outline=Array.isArray(content.study_outline)?content.study_outline:null;
 if(outline){
  return <div>
    {content.exam_coverage&&<ReviewerSection name="exam_coverage" value={content.exam_coverage} highlights={highlights}/>}
    {content.overview&&<ReviewerSection name="overview" value={content.overview} highlights={highlights}/>}
    <StudyOutline items={outline} highlights={highlights}/>
    {content.review_checklist&&<ReviewerSection name="review_checklist" value={content.review_checklist} highlights={highlights}/>}
  </div>;
 }

 const keys=Object.keys(content).filter(k=>k!=="study_outline");
 const ordered=[...LESSON_ORDER.filter(k=>keys.includes(k)),...keys.filter(k=>!LESSON_ORDER.includes(k))];
 return <div className="columns-1 gap-10 xl:columns-2 [column-fill:balance]">{ordered.map(k=><ReviewerSection key={k} name={k} value={content[k]} highlights={highlights}/>)}</div>;
}

export default function ModuleReader(){
 const params=useParams<{moduleId:string}>(),moduleId=params.moduleId,supabase=createClient();
 const [module,setModule]=useState<ModuleRow|null>(null),[lessons,setLessons]=useState<LessonRow[]>([]),[progress,setProgress]=useState<ProgressRow[]>([]);
 const [activeLesson,setActiveLesson]=useState<string|null>(null),[signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [noteId,setNoteId]=useState<string|null>(null),[noteText,setNoteText]=useState(""),[noteSaving,setNoteSaving]=useState(false);
 const [highlights,setHighlights]=useState<HighlightRow[]>([]),[selectedText,setSelectedText]=useState(""),[highlightColor,setHighlightColor]=useState<HighlightRow["color"]>("yellow");

 useEffect(()=>{load()},[moduleId]);
 async function load(){
  setLoading(true);const {data:{user}}=await supabase.auth.getUser();setSignedIn(!!user);
  const [mr,lr]=await Promise.all([
   supabase.from("modules").select("id,title,description,exam_area,estimated_minutes,tos_weight").eq("id",moduleId).eq("status","published").maybeSingle(),
   supabase.from("lessons").select("id,title,sequence,learning_objectives,content,key_takeaways,key_terms,estimated_minutes").eq("module_id",moduleId).eq("status","published").order("sequence")
  ]);
  setModule(mr.data as ModuleRow|null);const rows=(lr.data??[]) as LessonRow[];setLessons(rows);setActiveLesson(rows.find(x=>x.id===requestedLesson)?.id??rows[0]?.id??null);
  if(user&&rows.length){const {data}=await supabase.from("lesson_progress").select("lesson_id,status,progress_percent,completed_at").eq("user_id",user.id).in("lesson_id",rows.map(x=>x.id));setProgress((data??[]) as ProgressRow[])}
  setLoading(false);
 }
 useEffect(()=>{if(activeLesson&&signedIn)loadStudyTools(activeLesson);else{setNoteId(null);setNoteText("");setHighlights([])}},[activeLesson,signedIn]);

 async function loadStudyTools(lessonId:string){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const [nr,hr]=await Promise.all([
   supabase.from("user_notes").select("id,content").eq("user_id",user.id).eq("entity_type","lesson").eq("entity_id",lessonId).order("updated_at",{ascending:false}).limit(1).maybeSingle(),
   supabase.from("user_highlights").select("id,lesson_id,selected_text,color,created_at").eq("user_id",user.id).eq("lesson_id",lessonId).order("created_at")
  ]);
  setNoteId(nr.data?.id??null);setNoteText(nr.data?.content??"");setHighlights((hr.data??[]) as HighlightRow[]);
 }

 async function saveNote(){
  if(!current)return;const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Sign in to save personal notes.");return}
  setNoteSaving(true);
  if(!noteText.trim()&&noteId){await supabase.from("user_notes").delete().eq("id",noteId).eq("user_id",user.id);setNoteId(null);setMessage("Note removed.");setNoteSaving(false);return}
  if(!noteText.trim()){setNoteSaving(false);return}
  if(noteId){
   const {error}=await supabase.from("user_notes").update({content:noteText.trim(),updated_at:new Date().toISOString()}).eq("id",noteId).eq("user_id",user.id);
   if(error)setMessage(error.message);else setMessage("Personal note saved.");
  }else{
   const {data,error}=await supabase.from("user_notes").insert({user_id:user.id,entity_type:"lesson",entity_id:current.id,content:noteText.trim()}).select("id").single();
   if(error)setMessage(error.message);else{setNoteId(data.id);setMessage("Personal note saved.")}
  }
  setNoteSaving(false);
 }

 function captureSelection(){
  const sel=window.getSelection();const text=sel?.toString().trim()??"";
  if(!text||text.length>2000){setSelectedText("");return}
  const root=document.getElementById("reviewer-content");const node=sel?.anchorNode;
  if(root&&node&&root.contains(node))setSelectedText(text);
 }

 async function saveHighlight(){
  if(!current||!selectedText)return;const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Sign in to save highlights.");return}
  const {data,error}=await supabase.from("user_highlights").insert({user_id:user.id,lesson_id:current.id,selected_text:selectedText,color:highlightColor}).select("id,lesson_id,selected_text,color,created_at").single();
  if(error){setMessage(error.message);return}
  setHighlights(h=>[...h,data as HighlightRow]);setSelectedText("");window.getSelection()?.removeAllRanges();setMessage("Highlight saved.");
 }

 async function removeHighlight(id:string){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const {error}=await supabase.from("user_highlights").delete().eq("id",id).eq("user_id",user.id);
  if(error)setMessage(error.message);else setHighlights(h=>h.filter(x=>x.id!==id));
 }

 const progressMap=useMemo(()=>new Map(progress.map(x=>[x.lesson_id,x])),[progress]);
 const current=lessons.find(x=>x.id===activeLesson)??lessons[0];
 const allDone=lessons.length>0&&lessons.every(x=>!!progressMap.get(x.id)?.completed_at);

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
  <div className="mt-5"><p className="text-sm font-semibold text-indigo-700">{module.exam_area}</p><h1 className="mt-1 text-3xl font-bold">{module.title}</h1>{module.description&&<p className="mt-2 max-w-3xl leading-7 text-slate-500">{module.description}</p>}<div className="mt-3 flex gap-4 text-xs text-slate-500">{module.tos_weight&&<span>TOS weight {module.tos_weight}%</span>}<span>{lessons.length} lessons</span><span>Module assessment after lesson completion</span></div></div>
  {message&&<div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}
  {!signedIn&&<div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sign in to save lesson completion and unlock assessments.</div>}

  <div className="mt-7 grid gap-6 lg:grid-cols-[300px_1fr]">
   <Card className="sticky top-5 h-fit p-3"><div className="px-2 pb-3 pt-1 text-sm font-bold">Module Journey</div><div className="space-y-1">{lessons.map(l=>{const done=!!progressMap.get(l.id)?.completed_at;return <button key={l.id} onClick={()=>{setActiveLesson(l.id)}} className={"flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm "+(activeLesson===l.id?"bg-indigo-50 text-indigo-800":"hover:bg-slate-50")}>{done?<CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/>:<Circle size={17} className="mt-0.5 shrink-0 text-slate-300"/>}<span><span className="block text-xs text-slate-400">Lesson {l.sequence}</span><span className="font-medium">{l.title}</span></span></button>})}</div>
    {allDone?<Link href={"/assessment/module/"+module.id} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-left text-sm font-semibold text-indigo-800"><Trophy size={18}/><span>Module Assessment<span className="block text-xs font-normal">TOS-aligned LEPT-style items</span></span></Link>:<div className="mt-3 flex w-full items-center gap-3 rounded-xl border bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-400"><LockKeyhole size={18}/><span>Module Assessment<span className="block text-xs font-normal">Complete all lessons to unlock</span></span></div>}
   </Card>

   {current?<Card className="overflow-hidden border-slate-300 bg-slate-100 p-0 shadow-sm"><div className="border-b border-slate-300 bg-white px-6 py-4 sm:px-8"><div className="flex justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Reviewer Sheet • Lesson {current.sequence}</div><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{current.title}</h2></div>{current.estimated_minutes&&<div className="inline-flex items-center gap-2 text-sm text-slate-500"><Clock3 size={16}/>{current.estimated_minutes} min</div>}</div></div><div className="px-4 py-4 sm:px-5">
    <div className="mb-5 grid gap-3 md:grid-cols-2">
      <details className="border border-slate-300 bg-slate-50">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-extrabold text-slate-950"><Highlighter size={16}/> HIGHLIGHTS <span className="ml-auto text-xs font-medium text-slate-500">{highlights.length} saved</span></summary>
        <div className="border-t border-slate-300 p-4">
          <p className="text-xs text-slate-500">Select text inside the reviewer sheet, then save the highlight here.</p>
          {selectedText&&<div className="mt-3 border bg-white p-3">
            <div className="line-clamp-2 text-sm text-slate-700">“{selectedText}”</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">{(["yellow","green","blue","pink"] as const).map(color=><button key={color} onClick={()=>setHighlightColor(color)} className={"h-7 w-7 border "+HIGHLIGHT_CLASS[color]+(highlightColor===color?" ring-2 ring-indigo-500":"")} aria-label={color+" highlight"}/>)}
            <button onClick={saveHighlight} className="ml-1 bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white">Save highlight</button></div>
          </div>}
          {highlights.length>0&&<div className="mt-3 space-y-2">{highlights.map(h=><div key={h.id} className="flex items-start gap-2 border bg-white p-2 text-xs"><span className={"mt-0.5 h-4 w-1.5 shrink-0 "+HIGHLIGHT_CLASS[h.color]}/><span className="line-clamp-2 flex-1 text-slate-700">{h.selected_text}</span><button onClick={()=>removeHighlight(h.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button></div>)}</div>}
        </div>
      </details>

      <details className="border border-slate-300 bg-slate-50">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-extrabold text-slate-950"><StickyNote size={16}/> MY NOTES <span className="ml-auto text-xs font-medium text-slate-500">{noteText.trim()?"saved for this lesson":"optional"}</span></summary>
        <div className="border-t border-slate-300 p-4">
          <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} disabled={!signedIn} placeholder={signedIn?"Write mnemonics, reminders, questions, or your own reviewer notes...":"Sign in to save notes."} className="min-h-28 w-full resize-y border border-slate-300 bg-white p-3 text-sm leading-6 outline-none focus:border-indigo-500"/>
          <div className="mt-2 flex justify-end"><button onClick={saveNote} disabled={!signedIn||noteSaving} className="inline-flex items-center gap-2 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Save size={14}/>{noteSaving?"Saving...":"Save note"}</button></div>
        </div>
      </details>
    </div>

    <div id="reviewer-content" onMouseUp={captureSelection} className="border border-slate-300 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between border-b-2 border-slate-900 pb-2">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">LEPT REVIEW MATERIAL</div>
          <div className="text-lg font-extrabold text-slate-950">{current.title}</div>
        </div>
        <div className="text-right text-xs text-slate-500">Lesson {current.sequence}<br/>{current.estimated_minutes??30} min</div>
      </div>

      <div className="mb-6 border border-slate-400">
        <div className="border-b border-slate-400 bg-slate-100 px-3 py-2 text-[14px] font-extrabold text-slate-950">WHAT THIS LESSON PREPARES YOU TO ANSWER</div>
        <ul className="space-y-1 px-5 py-3 text-[13px] leading-5 text-slate-900">{normalizeList(current.learning_objectives).map((x,i)=><li key={i} className="list-disc">{x}</li>)}</ul>
      </div>

      {Array.isArray(current.key_terms)&&current.key_terms.length>0&&<section className="mb-6 break-inside-avoid">
        <h3 className="mb-2 text-[15px] font-extrabold text-slate-950 underline decoration-slate-400 underline-offset-4">KEY TERMINOLOGIES</h3>
        <div className="overflow-hidden border border-slate-400">
          <table className="w-full border-collapse text-[13px] leading-5"><tbody>{current.key_terms.map((item:any,i:number)=><tr key={i}><td className="w-[30%] border-b border-r border-slate-300 bg-slate-50 px-3 py-2 align-top font-bold text-slate-950">{item.term}</td><td className="border-b border-slate-300 px-3 py-2 align-top text-slate-800">{item.definition}</td></tr>)}</tbody></table>
        </div>
      </section>}

      <ExamLesson content={current.content} highlights={highlights}/>
    </div>
    {normalizeList(current.key_takeaways).length>0&&<section className="mt-6 border-2 border-slate-700 p-4"><h3 className="mb-2 text-[15px] font-extrabold text-slate-950">QUICK RECALL — REMEMBER THESE</h3><ul className="space-y-1.5 pl-5 text-[14px] leading-6 text-slate-900">{normalizeList(current.key_takeaways).map((x,i)=><li key={i} className="list-disc">{x}</li>)}</ul></section>}
    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <Link href={"/flashcards?module="+module.id+"&lesson="+current.id} className="border border-slate-300 bg-white p-4 hover:border-indigo-400"><Brain size={18} className="text-indigo-700"/><div className="mt-2 text-sm font-extrabold">Review Flashcards</div><div className="mt-1 text-xs leading-5 text-slate-500">Recall the terms and concepts from this lesson.</div></Link>
      <Link href={"/practice?module="+module.id+"&lesson="+current.id+"&count=5"} className="border border-slate-300 bg-white p-4 hover:border-indigo-400"><Target size={18} className="text-indigo-700"/><div className="mt-2 text-sm font-extrabold">Quick Check</div><div className="mt-1 text-xs leading-5 text-slate-500">Answer up to 5 reviewed LEPT-style questions from this lesson.</div></Link>
      <Link href="/mistakes" className="border border-slate-300 bg-white p-4 hover:border-indigo-400"><RotateCcw size={18} className="text-indigo-700"/><div className="mt-2 text-sm font-extrabold">Review Mistakes</div><div className="mt-1 text-xs leading-5 text-slate-500">Return to concepts you previously answered incorrectly.</div></Link>
    </section>
    <div className="mt-7 flex justify-end border-t border-slate-300 pt-5"><button disabled={!!progressMap.get(current.id)?.completed_at} onClick={()=>markComplete(current.id)} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-emerald-600">{progressMap.get(current.id)?.completed_at?"Completed":"Mark Lesson Complete"}</button></div>
   </div></Card>:<Card>No published lessons are available.</Card>}
  </div>
 </div></AppShell>;
}
