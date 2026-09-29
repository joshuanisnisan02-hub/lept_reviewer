"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) setError(error.message);
      else setMessage("Account created. If email confirmation is enabled, check your inbox before signing in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.refresh();
        router.push("/onboarding");
      }
    }
    setBusy(false);
  }

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
    <div className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white"><GraduationCap/></div>
        <div><div className="font-bold">LEPT Review Hub</div><div className="text-xs text-slate-500">Study with direction</div></div>
      </Link>
      <h1 className="text-2xl font-bold">{mode==="signin"?"Welcome back":"Create your review account"}</h1>
      <p className="mt-2 text-sm text-slate-500">{mode==="signin"?"Continue your LEPT review path.":"Save your progress, mistakes, flashcards, and study plan."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode==="signup"&&<label className="block text-sm font-medium">Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3"/></label>}
        <label className="block text-sm font-medium">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3"/></label>
        <label className="block text-sm font-medium">Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3"/></label>
        {error&&<div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {message&&<div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        <button disabled={busy} className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?"Please wait...":mode==="signin"?"Sign In":"Create Account"}</button>
      </form>
      <button onClick={()=>setMode(mode==="signin"?"signup":"signin")} className="mt-5 w-full text-sm font-semibold text-indigo-700">{mode==="signin"?"New here? Create an account":"Already have an account? Sign in"}</button>
      <Link href="/dashboard" className="mt-3 block text-center text-sm text-slate-500">Continue in demo mode</Link>
    </div>
  </main>;
}
