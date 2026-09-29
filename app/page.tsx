import Link from "next/link";
import { GraduationCap, ArrowRight, BookOpenCheck, Brain, Target, ShieldCheck, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white">
            <GraduationCap />
          </div>
          <b>LEPT Review Hub</b>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <LogIn size={16} />
            Sign In
          </Link>

          <Link
            href="/onboarding"
            className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800"
          >
            Start Reviewing
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="rounded-full border bg-white px-3 py-1 text-sm text-indigo-700">
              Structured for focused LEPT review
            </span>

            <h1 className="mt-6 text-5xl font-bold tracking-tight">
              Prepare Smarter for the LEPT.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A personal study companion organized around your exam level,
              specialization, strengths, weak areas, and next best review action.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white"
              >
                Start Reviewing <ArrowRight size={18} />
              </Link>

              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-5 py-3 font-semibold text-slate-700"
              >
                <LogIn size={17} />
                Sign In
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border bg-white px-5 py-3 font-semibold"
              >
                Open Demo
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-xl">
            <div className="text-sm text-slate-500">Recommended Next</div>
            <h2 className="mt-1 text-2xl font-bold">Assessment of Learning</h2>
            <p className="mt-2 text-slate-600">
              Recent accuracy in this competency is 48%.
            </p>

            <div className="mt-5 space-y-3">
              {[
                ["15 min review", BookOpenCheck],
                ["10 practice questions", Target],
                ["8 flashcards", Brain],
                ["Source-backed coverage", ShieldCheck],
              ].map(([text, Icon]: any) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <Icon size={18} className="text-indigo-600" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-8 text-center text-xs text-slate-500">
        LEPT Review Hub is an independent review platform and is not affiliated
        with or endorsed by the Professional Regulation Commission unless
        officially authorized.
      </footer>
    </div>
  );
}
