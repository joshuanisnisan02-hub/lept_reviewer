"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft,CheckCircle2,CircleAlert,Pencil,Search,ShieldCheck } from "lucide-react";

type Comp={id:string;code:string|null;title:string;exam_level:string};
type Q={
  id:string;question:string;choice_a:string;choice_b:string;choice_c:string;choice_d:string;
  correct_answer:string;rationale:string;exam_level:string;exam_area:string;review_status:string;
  verified:boolean;difficulty:string;bloom_level:string|null;module_id:string|null;competency_id:string|null;
  modules?:{title:string}|null;competencies?:{code:string|null;title:string}|null;
  sources?:{organization:string;document_title:string}|null;
};

export default function QuestionBankPage(){
  const supabase=createClient();
  const [role,setRole]=useState<string|null>(null);
  const [items,setItems]=useState<Q[]>([]);
  const [competencies,setCompetencies]=useState<Comp[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [checked,setChecked]=useState<string[]>([]);
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("for_review");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<any>(null);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return;}
    const {data:p}=await supabase.from("profiles").select("role").eq("user_id",user.id).maybeSingle();
    const r=p?.role??"learner"; setRole(r);
    if(r==="admin"||r==="content_reviewer"){
      const [qRes,cRes]=await Promise.all([
        supabase.from("questions")
          .select("id,question,choice_a,choice_b,choice_c,choice_d,correct_answer,rationale,exam_level,exam_area,review_status,verified,difficulty,bloom_level,module_id,competency_id,modules(title),competencies(code,title),sources(organization,document_title)")
          .eq("exam_area","Professional Education").eq("exam_level","Secondary").order("created_at",{ascending:false}).limit(500),
        supabase.from("competencies")
          .select("id,code,title,exam_level")
          .eq("exam_area","Professional Education")
          .eq("exam_level","Secondary")
          .order("code")
      ]);
      if(qRes.error)setMessage(qRes.error.message);
      const rows=(qRes.data??[]).map((row:any)=>({...row,modules:Array.isArray(row.modules)?(row.modules[0]??null):row.modules,competencies:Array.isArray(row.competencies)?(row.competencies[0]??null):row.competencies,sources:Array.isArray(row.sources)?(row.sources[0]??null):row.sources})) as Q[]; setItems(rows); if(!selected&&rows.length)setSelected(rows[0].id);
      setCompetencies((cRes.data??[]) as Comp[]);
    }
    setLoading(false);
  }

  const visible=useMemo(()=>items.filter(q=>{
    if(status!=="all"&&q.review_status!==status)return false;
    const s=search.trim().toLowerCase();
    if(s&&!([q.question,q.modules?.title,q.competencies?.code,q.competencies?.title].filter(Boolean).join(" ").toLowerCase().includes(s)))return false;
    return true;
  }),[items,status,search]);

  const current=items.find(q=>q.id===selected)??null;
  const coverage=useMemo(()=>competencies.map(comp=>{
    const related=items.filter(q=>q.competency_id===comp.id);
    return {
      ...comp,
      total:related.length,
      verified:related.filter(q=>q.review_status==="verified"||q.review_status==="published").length,
      published:related.filter(q=>q.review_status==="published"&&q.verified).length
    };
  }),[competencies,items]);
  const counts={
    total:items.length,
    review:items.filter(q=>q.review_status==="for_review").length,
    verified:items.filter(q=>q.review_status==="verified").length,
    published:items.filter(q=>q.review_status==="published"&&q.verified).length
  };

  async function action(kind:"return_draft"|"verify"|"publish",ids?:string[]){
    const targets=ids?.length?ids:selected?[selected]:[];
    if(!targets.length)return;
    setBusy(true);setMessage("");
    const note=kind==="return_draft"?(window.prompt("Revision note (optional):")??""):"";
    const {error}=await supabase.rpc("question_review_action",{p_question_ids:targets,p_action:kind,p_note:note||null});
    if(error)setMessage(error.message); else setMessage(targets.length+" question(s) updated.");
    setChecked([]);await load();setBusy(false);
  }

  function startEdit(){
    if(!current||role!=="admin")return;
    setForm({...current});setEditing(true);
  }

  async function saveEdit(){
    if(!current||!form||role!=="admin")return;
    setBusy(true);
    const {error}=await supabase.from("questions").update({
      question:form.question,choice_a:form.choice_a,choice_b:form.choice_b,choice_c:form.choice_c,choice_d:form.choice_d,
      correct_answer:form.correct_answer,rationale:form.rationale,difficulty:form.difficulty,bloom_level:form.bloom_level,
      review_status:"for_review",verified:false,verified_at:null,updated_at:new Date().toISOString()
    }).eq("id",current.id);
    if(error)setMessage(error.message);else{setEditing(false);setMessage("Question updated and returned to review.");await load();}
    setBusy(false);
  }

  if(loading)return <AppShell><div className="p-8 text-sm text-slate-500">Loading question bank...</div></AppShell>;
  if(role!=="admin"&&role!=="content_reviewer")return <AppShell><div className="mx-auto max-w-4xl p-8"><Card><CircleAlert className="text-amber-600"/><h1 className="mt-3 text-xl font-bold">Reviewer access required</h1></Card></div></AppShell>;

  return <AppShell><div className="mx-auto max-w-7xl p-5 sm:p-8">
    <Link href="/admin/content" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft size={15}/> Content Review</Link>
    <div className="mt-5"><p className="text-sm font-semibold text-indigo-700">Secondary • Professional Education</p><h1 className="text-3xl font-bold">Question Bank Review</h1><p className="mt-2 text-slate-500">Verify academic quality first. Only verified questions can be published to learner practice and diagnostics.</p></div>

    {message&&<div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{message}</div>}

    <div className="mt-6 grid gap-4 sm:grid-cols-4">
      <Card><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold">{counts.total}</div></Card>
      <Card><div className="text-sm text-slate-500">For Review</div><div className="text-2xl font-bold">{counts.review}</div></Card>
      <Card><div className="text-sm text-slate-500">Verified</div><div className="text-2xl font-bold">{counts.verified}</div></Card>
      <Card><div className="text-sm text-slate-500">Published</div><div className="text-2xl font-bold">{counts.published}</div></Card>
    </div>

    <Card className="mt-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search question, module, or TOS code" className="w-full rounded-xl border py-3 pl-9 pr-3 text-sm"/></div>
        
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border bg-white px-3 py-3 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="for_review">For review</option><option value="verified">Verified</option><option value="published">Published</option></select>
      </div>
    </Card>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{visible.length} shown • {checked.length} selected</span>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setChecked(checked.length?[]:visible.map(q=>q.id))} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold">{checked.length?"Clear selection":"Select visible"}</button>
        <button disabled={!checked.length||busy} onClick={()=>action("return_draft",checked)} className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40">Return to Draft</button>
        <button disabled={!checked.length||busy} onClick={()=>action("verify",checked)} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Verify Selected</button>
        {role==="admin"&&<button disabled={!checked.length||busy} onClick={()=>action("publish",checked)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Publish Selected</button>}
      </div>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <Card className="overflow-hidden p-0"><div className="max-h-[820px] divide-y overflow-auto">
        {visible.map(q=><div key={q.id} className={"flex gap-3 p-4 "+(selected===q.id?"bg-indigo-50":"")}>
          <input type="checkbox" checked={checked.includes(q.id)} onChange={()=>setChecked(x=>x.includes(q.id)?x.filter(i=>i!==q.id):[...x,q.id])} className="mt-1"/>
          <button onClick={()=>setSelected(q.id)} className="min-w-0 flex-1 text-left"><div className="text-xs font-semibold uppercase text-indigo-600">{q.exam_level} • {q.competencies?.code||"No code"}</div><div className="mt-2 line-clamp-3 text-sm font-medium leading-6">{q.question}</div><div className="mt-2 text-xs text-slate-400">{q.review_status.replace("_"," ")} • {q.modules?.title}</div></button>
        </div>)}
      </div></Card>

      <Card>
        {!current?<div className="text-sm text-slate-500">Select a question.</div>:editing?<>
          <div className="flex justify-between"><h2 className="text-lg font-bold">Edit Question</h2><button onClick={()=>setEditing(false)} className="text-sm font-semibold text-slate-500">Cancel</button></div>
          <div className="mt-4 grid gap-3">
            <textarea rows={4} value={form.question} onChange={e=>setForm({...form,question:e.target.value})} className="rounded-xl border p-3"/>
            {(["a","b","c","d"] as const).map(k=><input key={k} value={form["choice_"+k]} onChange={e=>setForm({...form,["choice_"+k]:e.target.value})} className="rounded-xl border p-3" placeholder={"Choice "+k.toUpperCase()}/>)}
            <div className="grid grid-cols-3 gap-3"><select value={form.correct_answer} onChange={e=>setForm({...form,correct_answer:e.target.value})} className="rounded-xl border p-3">{["A","B","C","D"].map(x=><option key={x}>{x}</option>)}</select><select value={form.bloom_level||"Understand"} onChange={e=>setForm({...form,bloom_level:e.target.value})} className="rounded-xl border p-3">{["Remember","Understand","Apply","Analyze","Evaluate"].map(x=><option key={x}>{x}</option>)}</select><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} className="rounded-xl border p-3">{["easy","moderate","difficult"].map(x=><option key={x}>{x}</option>)}</select></div>
            <textarea rows={4} value={form.rationale} onChange={e=>setForm({...form,rationale:e.target.value})} className="rounded-xl border p-3" placeholder="Rationale"/>
            <button disabled={busy} onClick={saveEdit} className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white">Save & Return to Review</button>
          </div>
        </>:<>
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase text-indigo-600">{current.exam_level} • {current.competencies?.code}</div><div className="mt-1 text-xs text-slate-500">{current.bloom_level} • {current.difficulty} • {current.review_status.replace("_"," ")}</div></div>{role==="admin"&&<button onClick={startEdit} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Pencil size={15}/> Edit</button>}</div>
          <h2 className="mt-5 text-xl font-bold leading-8">{current.question}</h2>
          <div className="mt-5 space-y-3">{(["A","B","C","D"] as const).map(letter=>{const val=(current as any)["choice_"+letter.toLowerCase()];const ok=current.correct_answer===letter;return <div key={letter} className={"rounded-xl border p-4 text-sm "+(ok?"border-emerald-400 bg-emerald-50":"")}><b>{letter}.</b> {val}{ok&&<span className="float-right text-xs font-bold text-emerald-700">CORRECT</span>}</div>})}</div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Rationale</div><p className="mt-2 text-sm leading-6">{current.rationale}</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><div className="text-xs uppercase text-slate-400">Competency</div><div className="mt-2 text-sm font-semibold">{current.competencies?.title}</div></div><div className="rounded-xl border p-4"><div className="text-xs uppercase text-slate-400">Source</div><div className="mt-2 text-sm font-semibold">{current.sources?.organization}</div><div className="mt-1 text-xs text-slate-500">{current.sources?.document_title}</div></div></div>
          <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>action("return_draft")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Return to Draft</button><button disabled={busy||current.review_status==="verified"||current.review_status==="published"} onClick={()=>action("verify")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><ShieldCheck size={15}/> Verify</button>{role==="admin"&&<button disabled={busy||!current.verified||current.review_status==="published"} onClick={()=>action("publish")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15}/> Publish</button>}</div>
        </>}
      </Card>
    </div>

    <Card className="mt-6 overflow-hidden p-0">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Competency Coverage</h2>
        <p className="mt-1 text-sm text-slate-500">Use this matrix to find TOS competencies that still need more reviewed and published questions.</p>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Level</th><th className="px-4 py-3">TOS</th><th className="px-4 py-3">Competency</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {coverage.map(row=><tr key={row.id}>
              <td className="px-4 py-3">{row.exam_level}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.code||"—"}</td>
              <td className="px-4 py-3 font-medium">{row.title}</td>
              <td className="px-4 py-3">{row.total}</td>
              <td className="px-4 py-3">{row.verified}</td>
              <td className="px-4 py-3">{row.published}</td>
              <td className="px-4 py-3"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+(
                row.total===0?"bg-rose-50 text-rose-700":
                row.published===0?"bg-amber-50 text-amber-700":
                row.published<3?"bg-blue-50 text-blue-700":
                "bg-emerald-50 text-emerald-700"
              )}>{row.total===0?"No questions":row.published===0?"Needs publishing":row.published<3?"Low coverage":"Covered"}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  </div></AppShell>;
}
