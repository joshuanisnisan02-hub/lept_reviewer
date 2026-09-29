"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    resetFeedback();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  async function signUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    resetFeedback();

    const normalizedEmail = email.trim().toLowerCase();

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      setBusy(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setBusy(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    if (!data.session) {
      setMessage(
        "Account created, but Supabase email confirmation is still enabled. Turn off Confirm email in Supabase to allow immediate account access."
      );
      setBusy(false);
      return;
    }

    router.refresh();
    router.push("/onboarding");
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

        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              resetFeedback();
            }}
            className={
              "rounded-lg px-3 py-2 text-sm font-semibold transition " +
              (mode === "signin"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500")
            }
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              resetFeedback();
            }}
            className={
              "rounded-lg px-3 py-2 text-sm font-semibold transition " +
              (mode === "signup"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500")
            }
          >
            Create Account
          </button>
        </div>

        <h1 className="mt-7 text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your reviewer account"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {mode === "signin"
            ? "Sign in with your email and password to continue your LEPT review."
            : "Create an account so your progress, mistakes, flashcards, and study plan can be saved."}
        </p>

        {mode === "signin" ? (
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@example.com"
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                {message}
              </div>
            )}

            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Full Name
              <input
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@example.com"
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold">
              Password
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                At least 8 characters.
              </span>
            </label>

            <label className="block text-sm font-semibold">
              Confirm Password
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-3 font-normal"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                {message}
              </div>
            )}

            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Creating account..." : "Create Account"}
            </button>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-indigo-600"
              />
              <p>
                Your password is handled by Supabase Auth. LEPT Review Hub stores
                only the profile and learning data needed for your reviewer.
              </p>
            </div>
          </form>
        )}

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
      </div>
    </main>
  );
}
