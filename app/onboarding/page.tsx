"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Specialization = {
  id: string;
  exam_level: "Elementary" | "Secondary";
  name: string;
  code: string | null;
  parent_id: string | null;
  guidance: string | null;
};

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const level: "Secondary" = "Secondary";
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [specializationId, setSpecializationId] = useState<string | null>(null);
  const [program, setProgram] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase
      .from("specializations")
      .select("id,exam_level,name,code,parent_id,guidance")
      .eq("active", true)
      .eq("exam_level", "Secondary")
      .order("name")
      .then(({ data }) => setSpecializations((data ?? []) as Specialization[]));
  }, []);

  const options = useMemo(
    () => specializations.filter(x => x.exam_level === level && !x.parent_id),
    [specializations, level]
  );

  const selectedParent = useMemo(
    () => options.find(x => x.name === program) ?? null,
    [options, program]
  );

  const childOptions = useMemo(() => {
    if (!selectedParent) return [];
    if (selectedParent.name === "Technology and Livelihood Education") {
      return specializations.filter(x => x.parent_id === selectedParent.id);
    }
    if (selectedParent.name === "Legacy MAPEH") {
      return specializations.filter(x =>
        x.exam_level === "Secondary" &&
        ["Culture and Arts Education","Physical Education"].includes(x.name)
      );
    }
    return [];
  }, [selectedParent, specializations]);

  function selectProgram(x: Specialization) {
    setProgram(x.name);
    const children = x.name === "Technology and Livelihood Education"
      ? specializations.filter(s => s.parent_id === x.id)
      : x.name === "Legacy MAPEH"
        ? specializations.filter(s => s.exam_level === "Secondary" && ["Culture and Arts Education","Physical Education"].includes(s.name))
        : [];
    setSpecializationId(children.length ? null : x.id);
  }

  async function finish() {
    if (!program || !specializationId) {
      setNotice("Please complete your LEPT level and specialization before building your review path.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setNotice("Your session could not be found. Please sign in again, then continue your setup.");
        return;
      }

      const profileData = {
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Reviewee",
        exam_level: level,
        program,
        specialization_id: specializationId,
        target_exam_date: targetDate || null,
        daily_study_minutes: minutes,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      const { data: existing, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError) {
        setNotice("Unable to check your reviewer profile: " + lookupError.message);
        return;
      }

      const saveResult = existing
        ? await supabase
            .from("profiles")
            .update(profileData)
            .eq("user_id", user.id)
        : await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              role: "learner",
              ...profileData
            });

      if (saveResult.error) {
        setNotice("Unable to save your review path: " + saveResult.error.message);
        return;
      }

      setStep(4);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? "Unable to save your review path: " + error.message
          : "Unable to save your review path. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function canContinue() {
    if (step === 1) return !!program && !!specializationId;
    return true;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-6 shadow-xl sm:p-9">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white"><GraduationCap size={20}/></div>
            <div><div className="font-bold">LEPT Review Hub</div><div className="text-xs text-slate-500">Personal review setup</div></div>
          </Link>
          <div className="text-xs font-medium text-slate-500">Step {Math.min(step + 1, 4)} of 4</div>
        </div>

        <div className="mb-8 flex gap-2">
          {[0,1,2,3].map(i => <div key={i} className={"h-1.5 flex-1 rounded-full " + (i <= step ? "bg-indigo-600" : "bg-slate-200")} />)}
        </div>

        {step === 0 && <>
          <h1 className="text-3xl font-bold">Let&apos;s build your LEPT review path.</h1>
          <p className="mt-3 leading-7 text-slate-600">Tell us what examination you&apos;re preparing for. We&apos;ll use your track, target date, and available study time to organize what you should review next.</p>
          <div className="mt-6 rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
            You can preview the system without an account. Signing in lets the platform save mastery, mistakes, flashcard reviews, and your study plan.
          </div>
        </>}

        {step === 1 && <>
          <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Secondary LEPT</div>
          <h2 className="mt-4 text-2xl font-bold">Choose your major / specialization</h2>
          <p className="mt-2 text-slate-500">This build currently focuses on Secondary LEPT examinees. Choose the field you will actually take.</p>
          <h2 className="text-2xl font-bold">Program / Specialization</h2>
          <p className="mt-2 text-slate-500">Choose the option that matches the field you will actually take in the LEPT.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {options.map(x => <button key={x.id} onClick={() => selectProgram(x)} className={"rounded-xl border p-4 text-left transition " + (program === x.name ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "hover:border-slate-300")}>
              <div className="font-semibold">{x.name}</div>
              {x.code && <div className="mt-1 text-xs text-slate-500">{x.code}</div>}
              {x.guidance && <div className="mt-2 text-xs leading-5 text-amber-700">{x.guidance}</div>}
            </button>)}
          </div>

          {childOptions.length > 0 && <div className="mt-6 rounded-2xl border bg-slate-50 p-5">
            <div className="font-semibold">Choose your actual field</div>
            <p className="mt-1 text-sm text-slate-500">{program === "Technology and Livelihood Education" ? "TLE review coverage must follow the area you will take." : "Legacy MAPEH examinees should select the current field they will take."}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {childOptions.map(x => <button key={x.id} onClick={() => setSpecializationId(x.id)} className={"rounded-xl border bg-white p-3 text-left text-sm font-medium " + (specializationId === x.id ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "")}>{x.name}</button>)}
            </div>
          </div>}
        </>}

        {step === 2 && <>
          <h2 className="text-2xl font-bold">When are you planning to take the LEPT?</h2>
          <p className="mt-2 text-slate-500">This will be used for your countdown and recommended weekly review load.</p>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="mt-6 w-full rounded-xl border bg-white px-4 py-3" />
          <button onClick={() => setTargetDate("")} className="mt-3 text-sm font-semibold text-indigo-700">Not sure yet</button>
        </>}

        {step === 3 && <>
          <h2 className="text-2xl font-bold">How much time can you realistically study?</h2>
          <p className="mt-2 text-slate-500">Choose a sustainable target. The planner can recalculate if you miss a day.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[[30,"30 minutes/day"],[60,"1 hour/day"],[120,"2 hours/day"],[180,"3+ hours/day"]].map(([value,label]) => <button key={value} onClick={() => setMinutes(Number(value))} className={"rounded-xl border p-4 text-left font-medium " + (minutes === Number(value) ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "")}>{label}</button>)}
          </div>
        </>}

        {step === 4 && <>
          <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 /></div>
          <h2 className="mt-5 text-2xl font-bold">Your review path is ready.</h2>
          <p className="mt-3 text-slate-600">{level} • {specializations.find(x => x.id === specializationId)?.name || program}</p>
          {notice && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button onClick={() => router.push("/practice?mode=diagnostic")} className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white">Take Diagnostic</button>
            <button onClick={() => router.push("/dashboard")} className="rounded-xl border bg-white px-4 py-3 font-semibold">Go to Dashboard</button>
          </div>
        </>}

        {step === 3 && notice && <div className="mt-5 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">{notice}</div>}

        {step < 4 && <div className="mt-8 flex justify-between">
          <button disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-30"><ArrowLeft size={16}/> Back</button>
          {step < 3 ? <button disabled={!canContinue()} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{step === 0 ? "Get Started" : "Continue"} <ArrowRight size={16}/></button>
            : <button disabled={saving} onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Build My Review Path"} <ArrowRight size={16}/></button>}
        </div>}
      </div>
    </main>
  );
}
