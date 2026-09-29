import Link from "next/link";
import { CircleAlert, GraduationCap } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border bg-white p-7 text-center shadow-xl">
        <Link href="/" className="mx-auto mb-7 flex w-fit items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white">
            <GraduationCap />
          </div>
          <span className="font-bold">LEPT Review Hub</span>
        </Link>

        <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600">
          <CircleAlert />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Google sign-in was not completed</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Please try again. If the problem continues, check that the Google provider and redirect URLs are configured in Supabase.
        </p>
        <Link href="/auth" className="mt-6 inline-block rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">
          Try Google Sign-In Again
        </Link>
      </div>
    </main>
  );
}
