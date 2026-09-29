"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "verify";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const maskedEmail = useMemo(() => {
    if (!pendingEmail.includes("@")) return pendingEmail;
    const [name, domain] = pendingEmail.split("@");
    const visible = name.slice(0, Math.min(2, name.length));
    return visible + "*".repeat(Math.max(2, name.length - visible.length)) + "@" + domain;
  }, [pendingEmail]);

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

    if (!normalizedEmail.endsWith("@gmail.com")) {
      setError("Please use a Gmail address ending in @gmail.com.");
      setBusy(false);
      return;
    }

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

    if (data.session) {
      setMessage("Email confirmation is currently disabled in Supabase. Enable email confirmation so new accounts must verify the 6-digit code.");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }

    setPendingEmail(normalizedEmail);
    setDigits(["", "", "", "", "", ""]);
    setMode("verify");
    setMessage("We sent a 6-digit verification code to your Gmail.");
    setBusy(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }

  function updateDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(text: string) {
    const code = text.replace(/\D/g, "").slice(0, 6);
    if (!code) return;
    const next = Array.from({ length: 6 }, (_, i) => code[i] ?? "");
    setDigits(next);
    inputRefs.current[Math.min(code.length, 6) - 1]?.focus();
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    resetFeedback();

    const token = digits.join("");
    if (token.length !== 6) {
      setError("Enter the complete 6-digit verification code.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token,
      type: "email",
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
    router.push("/onboarding");
  }

  async function resendCode() {
    setBusy(true);
    resetFeedback();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
    });

    if (error) {
      setError(error.message);
    } else {
      setDigits(["", "", "", "", "", ""]);
      setMessage("A new verification code was sent to your Gmail.");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }

    setBusy(false);
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

        {mode !== "verify" && (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  resetFeedback();
                }}
                className={
                  "rounded-lg px-3 py-2 text-sm font-semibold transition " +
                  (mode === "signin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")
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
                  (mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")
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
                ? "Sign in with your verified email and password to continue your LEPT review."
                : "Register with your Gmail address. You must verify the 6-digit code before continuing to onboarding."}
            </p>
          </>
        )}

        {mode === "signin" && (
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
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

            {error && <div className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">{error}</div>}
            {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">{message}</div>}

            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {mode === "signup" && (
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
              Gmail Address
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
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
              <span className="mt-1 block text-xs font-normal text-slate-400">At least 8 characters.</span>
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

            {error && <div className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">{error}</div>}
            {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">{message}</div>}

            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Creating account..." : "Create Account & Send Code"}
            </button>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-600" />
              <p>Your account must verify its Gmail address before the reviewer setup can continue.</p>
            </div>
          </form>
        )}

        {mode === "verify" && (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-indigo-50 text-indigo-700">
              <MailCheck />
            </div>
            <h1 className="mt-5 text-center text-2xl font-bold">Verify your Gmail</h1>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">
              Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{maskedEmail}</span>.
            </p>

            {message && <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-center text-sm leading-6 text-emerald-700">{message}</div>}
            {error && <div className="mt-5 rounded-xl bg-rose-50 p-3 text-center text-sm leading-6 text-rose-700">{error}</div>}

            <form onSubmit={verifyCode} className="mt-6">
              <div className="grid grid-cols-6 gap-2" onPaste={(e) => {
                e.preventDefault();
                handlePaste(e.clipboardData.getData("text"));
              }}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    value={digit}
                    onChange={(e) => updateDigit(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e.key)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    aria-label={"Verification digit " + (index + 1)}
                    className="h-14 rounded-xl border text-center text-xl font-bold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                ))}
              </div>

              <button
                disabled={busy || digits.join("").length !== 6}
                className="mt-6 w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify Email"}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm">
              <span className="text-slate-500">Didn&apos;t receive it?</span>
              <button
                type="button"
                onClick={resendCode}
                disabled={busy}
                className="font-semibold text-indigo-700 disabled:opacity-50"
              >
                Resend code
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                resetFeedback();
              }}
              className="mt-4 w-full text-center text-sm font-semibold text-slate-500"
            >
              Use a different Gmail address
            </button>
          </>
        )}

        {mode !== "verify" && (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}
