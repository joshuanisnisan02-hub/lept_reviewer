"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { BookOpenCheck, CircleAlert } from "lucide-react";

type Mistake = {
  question_id: string;
  status: "unresolved" | "improving" | "mastered";
  last_wrong_at: string | null;
  last_correct_at: string | null;
  correct_streak: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  rationale: string;
  exam_area: string;
  competency_title: string | null;
};

export default function Mistakes() {
  const supabase = createClient();
  const [items,setItems] = useState<Mistake[]>([]);
  const [loading,setLoading] = useState(true);
  const [signedIn,setSignedIn] = useState(false);
  const [message,setMessage] = useState("");

  useEffect(()=>{ load(); },[]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setSignedIn(!!user);
    if (!user) {
      setLoading(false);
      return;
    }
    const { data,error } = await supabase.rpc("get_my_mistakes", { p_limit: 50 });
    if (error) setMessage(error.message);
    setItems((data ?? []) as Mistake[]);
    setLoading(false);
  }

  if (loading) return <AppShell><div className="mx-auto max-w-5xl p-5 sm:p-8"><div className="text-sm text-slate-500">Loading mistake notebook...</div></div></AppShell>;

  if (!signedIn) return <AppShell>
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">My Mistakes</h1>
      <Card className="mt-7 border-dashed text-center shadow-none">
        <CircleAlert className="mx-auto text-indigo-600"/>
        <h2 className="mt-4 text-xl font-bold">Sign in to build your mistake notebook.</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Incorrect answers are saved automatically and move through unresolved, improving, and mastered states as you retry them successfully.</p>
        <Link href="/auth" className="mt-5 inline-block rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Sign In</Link>
      </Card>
    </div>
  </AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">My Mistakes</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Questions you miss are saved here automatically. Repeated correct attempts gradually move them toward mastered.</p>
      {message && <div className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</div>}

      {items.length ? <div className="mt-7 space-y-4">
        {items.map(item => {
          const choices:any = { A:item.choice_a, B:item.choice_b, C:item.choice_c, D:item.choice_d };
          return <Card key={item.question_id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{item.exam_area} • {item.competency_title || "Competency"}</div>
              <span className={
                "rounded-full px-2.5 py-1 text-xs font-semibold capitalize " +
                (item.status==="mastered" ? "bg-emerald-50 text-emerald-700" :
                 item.status==="improving" ? "bg-blue-50 text-blue-700" :
                 "bg-amber-50 text-amber-700")
              }>{item.status}</span>
            </div>

            <h2 className="mt-3 text-lg font-bold leading-7">{item.question}</h2>

            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm">
              <div className="text-xs font-semibold uppercase text-emerald-700">Correct answer</div>
              <div className="mt-1 font-medium">{item.correct_answer}. {choices[item.correct_answer]}</div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{item.rationale}</p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Correct retry streak: {item.correct_streak}</span>
              {item.last_wrong_at && <span>Last missed: {new Date(item.last_wrong_at).toLocaleDateString()}</span>}
              {item.last_correct_at && <span>Last correct: {new Date(item.last_correct_at).toLocaleDateString()}</span>}
            </div>
          </Card>;
        })}
      </div> : <Card className="mt-7 text-center shadow-none">
        <BookOpenCheck className="mx-auto text-emerald-600"/>
        <h2 className="mt-4 text-xl font-bold">No saved mistakes yet.</h2>
        <p className="mt-2 text-sm text-slate-500">Complete signed-in practice questions and missed items will appear here automatically.</p>
        <Link href="/practice" className="mt-5 inline-block text-sm font-semibold text-indigo-700">Start practice</Link>
      </Card>}
    </div>
  </AppShell>;
}
