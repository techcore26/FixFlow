import type { Metadata } from "next";
import { ArchitectureFlow } from "@/components/architecture/architecture-flow";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SimulationLabel } from "@/components/ui/simulation-label";

export const metadata: Metadata = { title: "Architecture" };

const stack = [
  ["01", "Interface", "Next.js · React · TypeScript", "Operator-facing application surfaces"],
  ["02", "API validation", "Route handlers · Zod", "Validated local mutations and explicit errors"],
  ["03", "Workflow integrity", "State machine · version checks · transactions", "Guarded transitions and approval integrity"],
  ["04", "Persistence", "SQLite · Drizzle · libSQL", "Local records and immutable audit history"],
] as const;

const roadmap = [
  ["Now", "Verified local workflow", "Human-controlled incident records, approvals, and audit history."],
  ["Next", "Verify Switch authentication and delivery", "Planned work; not connected or represented as active."],
  ["Later", "Optional deployment and authenticated multi-user mode", "Future scope, subject to separate implementation and safeguards."],
] as const;

export default function ArchitecturePage(){
  return <><MarketingHeader/><main className="architecture-page page-wrap">
    <header className="architecture-hero"><SectionHeading eyebrow="Under the hood" title="Simple where it matters. Safe where it counts." copy="One lightweight full-stack codebase turns an incident into an explicit, human-controlled resolution workflow."/></header>
    <ArchitectureFlow/>
    <section className="architecture-section" aria-labelledby="architecture-decisions"><SectionHeading eyebrow="Design decisions" title="Built to move fast without losing control."/><div className="architecture-deep-dives">
      <GlassCard className="architecture-deep-dive architecture-deep-dive--approval soft-grid"><p className="eyebrow">Deep dive · Approval boundary</p><h2 id="architecture-decisions">Approval is a snapshot, not a blank cheque.</h2><p>Every decision captures the exact proposed action. An approved snapshot enables record-only execution tracking; FixFlow itself executes no command or patch.</p><div className="architecture-approval-flow" aria-label="Approval record flow"><span>Awaiting approval</span><b>Human decision</b><span className="architecture-approval-flow__snapshot">Immutable approved-action snapshot</span><b>Record-only tracking</b><span>Audit event</span></div><small>Rejected and no-action decisions are recorded truthfully; they do not create an approved-action snapshot.</small></GlassCard>
      <GlassCard className="architecture-deep-dive architecture-deep-dive--switch"><div className="architecture-deep-dive__top"><p className="eyebrow">Deep dive · Switch boundary</p><SimulationLabel>Planned · unverified</SimulationLabel></div><h2>Switch stays outside the active system.</h2><p>Current findings are manual and never presented as Switch output. Authentication, delivery, and end-to-end connectivity remain unverified.</p><ul>{["No browser-visible Switch credentials","No persisted session cookies or secrets","No claim that authentication or delivery works","No command or patch execution"].map(item=><li key={item}><span aria-hidden="true">—</span>{item}</li>)}</ul></GlassCard>
    </div></section>
    <section className="architecture-section" aria-labelledby="architecture-stack"><SectionHeading eyebrow="The stack" title="Small, focused, local-first."/><div id="architecture-stack" className="architecture-stack">{stack.map(([number, role, technology, copy])=><GlassCard key={number} className="architecture-stack__tile card-lift"><span className="mono">{number}</span><p>{role}</p><h3>{technology}</h3><small>{copy}</small></GlassCard>)}</div></section>
    <section className="architecture-roadmap" aria-labelledby="architecture-roadmap-title"><div><p className="eyebrow">Roadmap</p><h2 id="architecture-roadmap-title">A deliberate path, without overclaiming.</h2></div><ol>{roadmap.map(([stage, title, copy], index)=><li key={stage} className={index === 0 ? "is-now" : ""}><span className="mono">0{index + 1} · {stage}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
  </main></>;
}
