import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ExternalLink, ShieldCheck } from "lucide-react";

export default async function Sources() {
  const supabase = createClient();
  const { data: sources } = await supabase
    .from("sources")
    .select("id,organization,document_title,document_type,url,publication_year,date_accessed,last_checked_at,authority_level,notes,status")
    .eq("is_active", true)
    .in("status", ["verified","published"])
    .order("authority_level")
    .order("publication_year", { ascending: false });

  return <AppShell>
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><ShieldCheck size={21}/></div>
        <div>
          <h1 className="text-3xl font-bold">Sources & Alignment</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-500">Every production module, competency, question, and flashcard should be traceable to current official sources. Superseded structures should not be silently mixed into active content.</p>
        </div>
      </div>

      <div className="mt-7 grid gap-4">
        {(sources ?? []).map((source:any) => <Card key={source.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Tier {source.authority_level}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{source.organization}</span>
              </div>
              <h2 className="mt-3 text-lg font-bold">{source.document_title}</h2>
              <p className="mt-2 text-sm text-slate-500">{source.document_type || "Reference"}{source.publication_year ? " • " + source.publication_year : ""}</p>
              {source.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{source.notes}</p>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                {source.date_accessed && <span>Retrieved: {source.date_accessed}</span>}
                {source.last_checked_at && <span>Last checked: {source.last_checked_at}</span>}
                <span className="capitalize">Status: {source.status}</span>
              </div>
            </div>
            {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open source <ExternalLink size={15}/></a>}
          </div>
        </Card>)}

        {!sources?.length && <Card className="text-sm text-slate-600">No active verified sources are registered yet.</Card>}
      </div>
    </div>
  </AppShell>;
}
