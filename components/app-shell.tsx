"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, BookOpen, Target, Brain, NotebookTabs, ChartNoAxesCombined, LibraryBig,
  GraduationCap, LogOut, CircleUserRound, ShieldCheck, FileQuestion, Layers3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const learnerNav=[
  ["/dashboard","Dashboard",Home],
  ["/study","Study",BookOpen],
  ["/practice","Practice",Target],
  ["/flashcards","Flashcards",Brain],
  ["/mistakes","My Mistakes",NotebookTabs],
  ["/progress","Progress",ChartNoAxesCombined],
  ["/sources","Sources",LibraryBig]
] as const;

const adminNav=[
  ["/admin","Admin Dashboard",ShieldCheck],
  ["/admin/questions","Question Bank",FileQuestion],
  ["/admin/content","Content Review",Layers3]
] as const;

export function AppShell({children}:{children:React.ReactNode}) {
  const path=usePathname();
  const router=useRouter();
  const supabase=createClient();
  const [userLabel,setUserLabel]=useState<string|null>(null);
  const [role,setRole]=useState<string|null>(null);
  const [authReady,setAuthReady]=useState(false);

  useEffect(()=>{
    let mounted=true;
    async function loadSession(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!mounted)return;
      if(!user){
        setUserLabel(null); setRole(null); setAuthReady(true); return;
      }
      setUserLabel(user.user_metadata?.full_name || user.email || "Learner");
      const {data:profile}=await supabase.from("profiles").select("role,full_name").eq("user_id",user.id).maybeSingle();
      if(!mounted)return;
      if(profile?.full_name)setUserLabel(profile.full_name);
      setRole(profile?.role ?? "learner");
      setAuthReady(true);
    }
    loadSession();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>loadSession());
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);

  async function signOut(){
    await supabase.auth.signOut();
    setUserLabel(null); setRole(null);
    router.refresh(); router.push("/");
  }

  const isAdmin=role==="admin";
  const isReviewer=role==="content_reviewer";
  const isStaff=isAdmin||isReviewer;
  const visibleNav=isStaff?adminNav:learnerNav;

  function isActive(href:string){
    if(href==="/admin")return path==="/admin";
    return path===href||path.startsWith(href+"/");
  }

  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white p-5 lg:block">
      <Link href={isStaff?"/admin":"/"} className="mb-8 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white"><GraduationCap/></div>
        <div>
          <b>LEPT Review Hub</b>
          <div className="text-xs text-slate-500">{isStaff?"Administration":"Study with direction"}</div>
        </div>
      </Link>

      {isStaff&&<div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Administration</div>}
      <nav className="space-y-1">
        {visibleNav.map(([href,label,Icon])=><Link
          key={href}
          href={href}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100",isActive(href)&&"bg-indigo-50 text-indigo-700")}
        ><Icon size={18}/>{label}</Link>)}
      </nav>

      <div className="absolute bottom-5 left-5 right-5">
        {!authReady ? <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">Checking session...</div>
        : userLabel ? <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <CircleUserRound size={26}/>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{userLabel}</div>
              <div className="mt-0.5 text-xs text-slate-500">{isAdmin?"Administrator":isReviewer?"Content Reviewer":"Learner"}</div>
            </div>
          </div>
          <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-white"><LogOut size={15}/> Sign out</button>
        </div>
        : <Link href="/auth" className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><CircleUserRound size={18}/> Sign in to save progress</Link>}
      </div>
    </aside>

    <main className="pb-20 lg:ml-64 lg:pb-0">{children}</main>

    <nav className={cn("fixed inset-x-0 bottom-0 z-20 grid border-t bg-white px-2 py-2 lg:hidden",isStaff?"grid-cols-3":"grid-cols-5")}>
      {isStaff ? adminNav.map(([href,label,Icon])=><Link key={href} href={href} className={cn("flex flex-col items-center gap-1 text-[11px] text-slate-600",isActive(href)&&"text-indigo-700")}><Icon size={19}/><span>{label==="Admin Dashboard"?"Admin":label==="Question Bank"?"Questions":"Content"}</span></Link>)
      : learnerNav.slice(0,4).map(([href,label,Icon])=><Link key={href} href={href} className={cn("flex flex-col items-center gap-1 text-[11px] text-slate-600",isActive(href)&&"text-indigo-700")}><Icon size={19}/><span>{label}</span></Link>).concat(
        <Link key="/mistakes" href="/mistakes" className={cn("flex flex-col items-center gap-1 text-[11px] text-slate-600",isActive("/mistakes")&&"text-indigo-700")}><NotebookTabs size={19}/><span>More</span></Link>
      )}
    </nav>
  </div>;
}
