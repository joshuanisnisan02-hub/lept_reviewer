"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Brain, RotateCcw } from "lucide-react";

type CardRow = {
  id: string;
  front: string;
  back: string;
  card_type: string;
};

const demoCards = [
  { id:"demo-1", front:"Validity", back:"Evidence supports the intended interpretation and use of assessment results.", card_type:"concept" },
  { id:"demo-2", front:"Reliability", back:"Consistency or stability of measurement results across appropriate conditions.", card_type:"concept" },
  { id:"demo-3", front:"Formative Assessment", back:"Assessment used during learning to provide feedback and guide next instructional steps.", card_type:"concept" }
];

export default function Flashcards() {
  const supabase = createClient();
  const [cards,setCards] = useState<CardRow[]>([]);
  const [index,setIndex] = useState(0);
  const [flip,setFlip] = useState(false);
  const [guest,setGuest] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGuest(true);
      setCards(demoCards);
      setLoading(false);
      return;
    }

    const { data,error } = await supabase.rpc("get_due_flashcards", { p_limit: 30 });
    if (error) setMessage(error.message);
    setCards((data ?? []) as CardRow[]);
    setGuest(false);
    setLoading(false);
  }

  async function rate(rating:"again"|"hard"|"good"|"easy") {
    if (!cards[index]) return;
    if (!guest) {
      const { error } = await supabase.rpc("review_flashcard", {
        p_flashcard_id: cards[index].id,
        p_rating: rating
      });
      if (error) {
        setMessage(error.message);
        return;
      }
    }

    if (index >= cards.length - 1) {
      setCards([]);
      setIndex(0);
      setFlip(false);
      setMessage(guest ? "Demo deck complete." : "Review queue complete. Your next review dates have been scheduled.");
    } else {
      setIndex(index + 1);
      setFlip(false);
    }
  }

  if (loading) return <AppShell><div className="mx-auto max-w-3xl p-5 sm:p-8"><div className="text-sm text-slate-500">Loading review queue...</div></div></AppShell>;

  if (!cards.length) return <AppShell>
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="text-3xl font-bold">Flashcards</h1>
      <Card className="mt-7 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-indigo-50 text-indigo-700"><Brain/></div>
        <h2 className="mt-4 text-xl font-bold">Nothing due right now.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message || "Published cards will appear here when they are due for spaced review."}</p>
        {!guest && <button onClick={load} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><RotateCcw size={15}/> Refresh queue</button>}
      </Card>
    </div>
  </AppShell>;

  const card=cards[index];

  return <AppShell>
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Flashcards</h1><p className="mt-2 text-slate-500">{cards.length-index} card{cards.length-index===1?"":"s"} remaining</p></div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">{card.card_type}</span>
      </div>

      {guest && <div className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">Demo deck only. <Link href="/auth" className="font-semibold underline">Sign in</Link> for scheduled review and saved retention history.</div>}
      {message && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}

      <button onClick={()=>setFlip(!flip)} className="mt-7 block w-full">
        <Card className="grid min-h-[360px] place-items-center text-center">
          <div className="max-w-xl">
            <div className="text-sm font-semibold text-indigo-600">{flip?"Explanation":"Concept"}</div>
            <div className="mt-5 text-3xl font-bold leading-tight">{flip?card.back:card.front}</div>
            <div className="mt-8 text-sm text-slate-400">Tap to flip</div>
          </div>
        </Card>
      </button>

      {flip ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={()=>rate("again")} className="rounded-xl border bg-white px-3 py-3 text-sm font-semibold">Again</button>
        <button onClick={()=>rate("hard")} className="rounded-xl border bg-white px-3 py-3 text-sm font-semibold">Hard</button>
        <button onClick={()=>rate("good")} className="rounded-xl bg-indigo-700 px-3 py-3 text-sm font-semibold text-white">Good</button>
        <button onClick={()=>rate("easy")} className="rounded-xl border bg-white px-3 py-3 text-sm font-semibold">Easy</button>
      </div> : <p className="mt-4 text-center text-sm text-slate-500">Flip the card before rating how well you remembered it.</p>}
    </div>
  </AppShell>;
}
