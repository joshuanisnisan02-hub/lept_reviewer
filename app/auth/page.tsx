"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.04H12v3.86h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.39 13.9a6.02 6.02 0 0 1 0-3.8V7.51H3.04a10 10 0 0 0 0 8.98l3.35-2.59Z"/>
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.82 1.49l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z"/>
    </svg>
  );
}

export default function AuthPage() {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    setBusy(true);
    setError("");

    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white">
            <GraduationCap />
          </div>
          <div>
            <div className="font-bold">LEPT Review Hub</div>
            <div className="text-xs text-slate-500">Study with direction</div>
          </div>
        </Link>

        <h1 className="text-2xl font-bold">Continue to LEPT Review Hub</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use your Google account to create or access your reviewer profile, saved progress, mistakes, flashcards, and study plan.
        </p>

        {error && (
          <div className="mt-5 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={busy}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border bg-white px-4 py-3 font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? "Opening Google..." : "Continue with Google"}
        </button>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-600" />
          <p>
            Google handles your sign-in credentials. LEPT Review Hub receives the account identity needed to maintain your reviewer profile and learning progress.
          </p>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/dashboard"
          className="block rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Continue in Demo Mode
        </Link>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          By continuing, you use the same Google sign-in for both new and returning accounts. No separate password is required.
        </p>
      </div>
    </main>
  );
}
