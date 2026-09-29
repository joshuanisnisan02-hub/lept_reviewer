"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { sampleQuestions } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, CircleAlert, ClipboardCheck, LockKeyhole, TimerReset } from "lucide-react";

type DbQuestion = {
  id: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  exam_area: string;
  difficulty: string | null;
  question_type?: string | null;
};

type DiagnosticRow = {
  session_id: string;
  sequence: number;
  id: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  exam_area: string;
  difficulty: string | null;
};

type PracticeQuestion = {
  id: string;
  question: string;
  choices: string[];
  examArea: string;
  demoAnswer?: number;
  demoRationale?: string;
};

type Result = {
  isCorrect: boolean;
  correctAnswer: string;
  rationale: string;
};

export default function Practice() {
  const params = useSearchParams();
  const router = useRouter();
  const diagnostic = params.get("mode") === "diagnostic";
  const supabase = createClient();

  const [coverage, setCoverage] = useState("All Subjects");
  const [count, setCount] = useState(diagnostic ? 50 : 10);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setLoading(true);
    setMessage("");
    setQuestions([]);
    setResult(null);
    setSelected(null);
    setIndex(0);
    setSessionId(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setGuestMode(true);
      setQuestions(sampleQuestions.map(q => ({
        id: String(q.id),
        question: q.question,
        choices: q.choices,
        examArea: q.area,
        demoAnswer: q.answer,
        demoRationale: q.rationale
      })));
      setLoading(false);
      return;
    }

    setGuestMode(false);

    if (diagnostic) {
      const { data, error } = await supabase.rpc("start_diagnostic", {
        p_limit: count
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as DiagnosticRow[];
      if (!rows.length) {
        setMessage("No verified published questions are available for your diagnostic yet.");
        setLoading(false);
        return;
      }

      setSessionId(rows[0].session_id);
      setQuestions(rows.map(q => ({
        id: q.id,
        question: q.question,
        choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
        examArea: q.exam_area
      })));
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("specialization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const area =
      coverage === "General Education" ? "General Education" :
      coverage === "Professional Education" ? "Professional Education" :
      coverage === "Specialization" ? "Specialization" :
      null;

    const { data, error } = await supabase.rpc("get_practice_questions", {
      p_limit: count,
      p_exam_area: area,
      p_specialization_id: profile?.specialization_id ?? null
    });

    if (error) {
      setMessage(error.message);
    } else {
      const rows = (data ?? []) as DbQuestion[];
      setQuestions(rows.map(q => ({
        id: q.id,
        question: q.question,
        choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
        examArea: q.exam_area
      })));

      if (!rows.length) {
        setMessage("No verified questions are published for this coverage yet. The question bank will populate as official TOS-aligned content is reviewed and approved.");
      }
    }
    setLoading(false);
  }

  async function submitAnswer() {
    if (selected === null || !questions[index]) return;
    const q = questions[index];

    if (guestMode) {
      setResult({
        isCorrect: selected === q.demoAnswer,
        correctAnswer: String.fromCharCode(65 + (q.demoAnswer ?? 0)),
        rationale: q.demoRationale ?? ""
      });
      return;
    }

    const selectedLetter = String.fromCharCode(65 + selected);

    if (diagnostic) {
      if (!sessionId) return;
      setSubmitting(true);
      setMessage("");

      const { error } = await supabase.rpc("submit_assessment_answer", {
        p_session_id: sessionId,
        p_question_id: q.id,
        p_selected_answer: selectedLetter,
        p_duration_seconds: null
      });

      if (error) {
        setMessage(error.message);
        setSubmitting(false);
        return;
      }

      if (index >= questions.length - 1) {
        const { error: finalizeError } = await supabase.rpc("finalize_diagnostic", {
          p_session_id: sessionId
        });

        setSubmitting(false);

        if (finalizeError) {
          setMessage(finalizeError.message);
          return;
        }

        router.push("/diagnostic/results?session=" + encodeURIComponent(sessionId));
        return;
      }

      setIndex(index + 1);
      setSelected(null);
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc("submit_question_attempt", {
      p_question_id: q.id,
      p_selected_answer: selectedLetter,
      p_attempt_type: "practice",
      p_duration_seconds: null
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const row = data?.[0];
    if (row) {
      setResult({
        isCorrect: row.is_correct,
        correctAnswer: row.correct_answer,
        rationale: row.rationale
      });
    }
  }

  function next() {
    if (index >= questions.length - 1) {
      setQuestions([]);
      setMessage("Practice session complete. Your signed-in results are now reflected in mastery and mistake tracking.");
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setResult(null);
  }

  if (!questions.length) {
    return <AppShell>
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <p className="text-sm font-semibold text-indigo-700">{diagnostic ? "Diagnostic Assessment" : "Practice"}</p>
        <h1 className="mt-1 text-3xl font-bold">{diagnostic ? "Find Your Starting Point" : "Generate Practice Test"}</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          {diagnostic
            ? "Your diagnostic builds an initial picture of competency strengths and priority review areas using verified published questions matched to your LEPT track."
            : "Choose a coverage area and generate a fresh set from the verified question bank."}
        </p>

        {message && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">{message}</div>}

        <Card className="mt-7">
          {diagnostic ? <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <ClipboardCheck className="text-indigo-600" size={20}/>
                <div className="mt-3 text-sm font-semibold">TOS-weighted</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Questions are distributed using published module weights where available.</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <LockKeyhole className="text-indigo-600" size={20}/>
                <div className="mt-3 text-sm font-semibold">No instant answers</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Correct answers are withheld until the assessment is complete.</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <TimerReset className="text-indigo-600" size={20}/>
                <div className="mt-3 text-sm font-semibold">Builds your plan</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Results feed mastery tracking and the first study-plan priorities.</div>
              </div>
            </div>

            <label className="mt-6 block text-sm font-semibold">Diagnostic Length
              <select value={count} onChange={e=>setCount(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 font-normal">
                {[20,30,50].map(n=><option key={n} value={n}>{n} questions</option>)}
              </select>
            </label>

            <p className="mt-4 text-xs leading-5 text-slate-500">The system can only use questions that have passed the content-review workflow and are explicitly published.</p>
          </> : <>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-semibold">Coverage
                <select value={coverage} onChange={e=>setCoverage(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 font-normal">
                  <option>All Subjects</option>
                  <option>General Education</option>
                  <option>Professional Education</option>
                  <option>Specialization</option>
                </select>
              </label>
              <label className="text-sm font-semibold">Questions
                <select value={count} onChange={e=>setCount(Number(e.target.value))} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 font-normal">
                  {[10,20,30,50].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <LockKeyhole size={18} className="mt-0.5 shrink-0 text-indigo-600"/>
              Correct answers are not delivered with signed-in question data. They are evaluated securely only when you submit an answer.
            </div>
          </>}

          <Button onClick={generate} disabled={loading} className="mt-6">
            {loading ? "Preparing..." : diagnostic ? "Start Diagnostic" : "Generate Practice Test"}
          </Button>
        </Card>
      </div>
    </AppShell>;
  }

  const q = questions[index];

  return <AppShell>
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold">Question {index + 1} of {questions.length}</span>
        <span className="text-slate-500">{q.examArea}</span>
      </div>
      <div className="mb-6 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{width: ((index + 1) / questions.length * 100) + "%"}}/>
      </div>

      {guestMode && <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
        Demo mode uses sample questions. <Link href="/auth" className="font-semibold underline">Sign in</Link> to save mastery and diagnostic history.
      </div>}

      {diagnostic && !guestMode && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
        Diagnostic mode: your answer will be recorded, but correctness and rationale are intentionally hidden until the assessment is complete.
      </div>}

      <Card>
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{q.examArea}</div>
        <h2 className="mt-3 text-xl font-semibold leading-8">{q.question}</h2>

        <div className="mt-6 space-y-3">
          {q.choices.map((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            const correct = !diagnostic && result && letter === result.correctAnswer;
            const wrongSelected = !diagnostic && result && selected === i && !result.isCorrect;
            return <button
              key={letter}
              disabled={!!result || submitting}
              onClick={()=>setSelected(i)}
              className={
                "flex w-full gap-3 rounded-xl border p-4 text-left transition " +
                (correct ? "border-emerald-500 bg-emerald-50 " :
                 wrongSelected ? "border-rose-400 bg-rose-50 " :
                 selected === i ? "border-indigo-600 bg-indigo-50 " : "bg-white hover:border-slate-300")
              }
            >
              <b>{letter}.</b><span>{choice}</span>
            </button>;
          })}
        </div>

        {!diagnostic && result && <div className={"mt-6 rounded-xl p-4 text-sm leading-6 " + (result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950")}>
          <div className="flex items-center gap-2 font-bold">
            {result.isCorrect ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}
            {result.isCorrect ? "Correct" : "Review this concept"}
          </div>
          <p className="mt-2">{result.rationale}</p>
        </div>}
      </Card>

      {message && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</div>}

      <div className="mt-5 flex justify-end">
        {diagnostic && !guestMode
          ? <Button onClick={submitAnswer} disabled={selected === null || submitting}>
              {submitting ? "Saving..." : index === questions.length - 1 ? "Finish Diagnostic" : "Save & Continue"}
            </Button>
          : !result
            ? <Button onClick={submitAnswer} disabled={selected === null}>Submit Answer</Button>
            : <Button onClick={next}>{index === questions.length - 1 ? "Finish Session" : "Next Question"}</Button>}
      </div>
    </div>
  </AppShell>;
}
