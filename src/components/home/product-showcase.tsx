import Link from "next/link";
import { AuditIcon, ApprovalIcon, ArrowIcon, IncidentIcon } from "@/components/ui/icons";

export function ProductShowcase(){
  return <section className="product-showcase">
    <div className="product-showcase__copy">
      <p className="eyebrow">The real product, not a promise</p>
      <h2 className="mt-5 text-4xl font-semibold leading-[1] tracking-[-.055em] sm:text-6xl">Every decision stays <span className="serif prism-text">visible.</span></h2>
      <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">The local application provides real incident records, guarded workflow transitions, approval integrity, execution tracking, closure, and Markdown export.</p>
      <ul className="mt-8 space-y-4 text-sm text-[var(--ink-soft)]">{["Real persisted incident state","Human approval before execution tracking","Complete transactional audit history","Postmortem generated from recorded facts"].map((item,index)=><li key={item} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">✓</span><span>{item}</span>{index===0&&<span className="mono ml-auto text-[9px] text-[var(--faint)]">AVAILABLE NOW</span>}</li>)}</ul>
      <Link href="/dashboard" className="mt-9 inline-flex items-center gap-2 font-semibold text-violet-700">Open the real workspace <ArrowIcon width={18}/></Link>
    </div>
    <div className="product-showcase__ui"><div className="product-showcase__bar"><span/><span/><span/><p className="mono ml-auto text-[9px] text-[var(--faint)]">LOCAL WORKSPACE</p></div><div className="product-showcase__body"><aside><div className="h-9 rounded-xl bg-[var(--prism)]"/><div/><div/><div/></aside><main><div className="grid grid-cols-3 gap-3">{[["Active","2"],["Approval","1"],["Resolved","4"]].map(([label,value])=><div key={label} className="rounded-2xl bg-white/85 p-4"><p className="text-[10px] text-[var(--muted)]">{label}</p><p className="serif mt-2 text-3xl">{value}</p></div>)}</div><div className="mt-3 rounded-2xl bg-white/85 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Illustrative interface preview</p><span className="mono text-[8px] text-[var(--faint)]">NO LIVE DATA</span></div><div className="mt-4 space-y-2">{[[IncidentIcon,"Incident reported","Open"],[ApprovalIcon,"Human decision","Awaiting approval"],[AuditIcon,"Audit history","Recorded"]].map(([Icon,label,status])=>{const C=Icon as typeof IncidentIcon;return <div key={String(label)} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border border-[var(--line)] p-3"><span className="text-violet-500"><C width={16}/></span><span className="text-xs font-semibold">{String(label)}</span><span className="text-[9px] text-[var(--muted)]">{String(status)}</span></div>})}</div></div></main></div></div>
  </section>;
}
