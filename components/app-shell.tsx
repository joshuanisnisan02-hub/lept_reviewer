"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home,BookOpen,Target,Brain,NotebookTabs,ChartNoAxesCombined,LibraryBig,GraduationCap,LogOut,CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav=[
  ["/dashboard","Dashboard",Home],
  ["/study","Study",BookOpen],
  ["/practice","Practice",Target],
  ["/flashcards","Flashcards",Brain],
  ["/mistakes","My Mistakes",NotebookTabs],
  ["/progress","Progress",ChartNoAxesCombined],
  ["/sources","Sources",LibraryBig]
] as const;

export function AppShell({children}:{children:React.ReactNode}) {
  const path=usePathname();
  const router=useRouter();
  const supabase=createClient();
  const [userLabel,setUserLabel]=useState<string|null>(null);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      const user=data.user;
      if (user) setUserLabel(user.user_metadata?.full_name || user.email || "Learner");
    });
  },[]);

  async function signOut(){
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white p-5 lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white"><GraduationCap/></div>
        <div><b>LEPT Review Hub</b><div className="text-xs text-slate-500">Study with direction</div></div>
      </Link>

      <nav className="space-y-1">
        {nav.map(([href,label,Icon])=><Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100",path===href&&"bg-indigo-50 text-indigo-700")}><Icon size={18}/>{label}</Link>)}
      </nav>

      <div className="absolute bottom-5 left-5 right-5">
        {userLabel ? <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3"><CircleUserRound size={26}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{userLabel}</div><div className="text-xs text-slate-500">Signed in</div></div></div>
          <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white"><LogOut size={15}/> Sign out</button>
        </div> : <Link href="/auth" className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><CircleUserRound size={18}/> Sign in to save progress</Link>}
      </div>
    </aside>

    <main className="pb-20 lg:ml-64 lg:pb-0">{children}</main>

    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-white px-2 py-2 lg:hidden">
      {nav.slice(0,5).map(([href,label,Icon])=><Link key={href} href={href} className={cn("flex flex-col items-center gap-1 text-[11px] text-slate-600",path===href&&"text-indigo-700")}><Icon size={19}/><span>{label==="My Mistakes"?"More":label}</span></Link>)}
    </nav>
  </div>;
}
