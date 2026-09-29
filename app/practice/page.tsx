"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { sampleQuestions } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react";

type DbQuestion = {
  id: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  exam_area: string;
  difficulty: string | null;
  question_type: string | null;
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
  const diagnostic = params.get("mode") === "diagnostic";
  const supabase = createClient();

  const [coverage, setCoverage] = useState("All Subjects");
  const [count, setCount] = useState(diagnostic ? 20 : 10);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setLoading(true);
    setMessage("");
    setQuestions([]);
    setResult(null);
    setSelected(null);
    setIndex(0);

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
    const { data, error } = await supabase.rpc("submit_question_attempt", {
      p_question_id: q.id,
      p_selected_answer: selectedLetter,
      p_attempt_type: diagnostic ? "diagnostic" : "practice",
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
        <p className="text-sm font-semibold text-indigo-700">{diagnostic ? "Diagnostic" : "Practice"}</p>
        <h1 className="mt-1 text-3xl font-bold">{diagnostic ? "Start Your Diagnostic" : "Generate Practice Test"}</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          {diagnostic
            ? "Build the first picture of your strengths and weak areas. Only verified published questions are used for signed-in diagnostic sessions."
            : "Choose a coverage area and generate a fresh set from the verified question bank."}
        </p>

        {message && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">{message}</div>}

        <Card className="mt-7">
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
        Demo mode uses sample questions. <Link href="/auth" className="font-semibold underline">Sign in</Link> to save mastery and mistakes.
      </div>}

      <Card>
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{q.examArea}</div>
        <h2 className="mt-3 text-xl font-semibold leading-8">{q.question}</h2>

        <div className="mt-6 space-y-3">
          {q.choices.map((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            const correct = result && letter === result.correctAnswer;
            const wrongSelected = result && selected === i && !result.isCorrect;
            return <button
              key={choice}
              disabled={!!result}
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

        {result && <div className={"mt-6 rounded-xl p-4 text-sm leading-6 " + (result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950")}>
          <div className="flex items-center gap-2 font-bold">
            {result.isCorrect ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}
            {result.isCorrect ? "Correct" : "Review this concept"}
          </div>
          <p className="mt-2">{result.rationale}</p>
        </div>}
      </Card>

      {message && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</div>}

      <div className="mt-5 flex justify-end">
        {!result
          ? <Button onClick={submitAnswer} disabled={selected === null}>Submit Answer</Button>
          : <Button onClick={next}>{index === questions.length - 1 ? "Finish Session" : "Next Question"}</Button>}
      </div>
    </div>
  </AppShell>;
}
