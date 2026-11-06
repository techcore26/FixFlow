import { ApprovalIcon, ArchitectureIcon, AuditIcon, IncidentIcon } from "@/components/ui/icons";

export const verifiedArchitectureLayers = [
  { number: "01", title: "Operator experience", copy: "Accessible Next.js pages keep operators in control of every incident decision.", tags: ["Next.js 16", "React 19"], tone: "experience", Icon: IncidentIcon },
  { number: "02", title: "Validated API", copy: "Typed route handlers validate mutations and enforce local same-origin safeguards.", tags: ["Route handlers", "Zod"], tone: "api", Icon: ArchitectureIcon },
  { number: "03", title: "Guarded workflow", copy: "Legal transitions, version checks, approval snapshots, and record-only execution tracking stay centralized.", tags: ["State machine", "Human approval"], tone: "workflow", Icon: ApprovalIcon },
  { number: "04", title: "SQLite audit record", copy: "Typed repositories persist incidents and their immutable operational history transactionally.", tags: ["SQLite", "Drizzle", "libSQL"], tone: "persistence", Icon: AuditIcon },
] as const;

export const plannedSwitchBoundary = {
  status: "Planned · unverified",
  title: "Future Switch Gateway adapter",
  copy: "FixFlow-to-Switch authentication and agent delivery are not implemented. Any future integration remains server-side and must be verified before it is represented as active.",
} as const;

export function ArchitectureFlow(){
  return <section className="architecture-flow" aria-labelledby="architecture-flow-title">
    <div className="architecture-flow__heading">
      <div><p className="eyebrow">Verified local system</p><h2 id="architecture-flow-title">One guarded path, with every handoff accounted for.</h2></div>
      <div className="architecture-flow__legend" aria-label="Architecture legend"><span><i className="architecture-flow__legend-dot"/>Verified local component</span><span><i className="architecture-flow__legend-dash"/>Planned boundary</span></div>
    </div>
    <div className="architecture-flow__diagram">
      <svg className="architecture-flow__rails" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="architecture-rail" x1="0" x2="1"><stop stopColor="#e0679a"/><stop offset=".52" stopColor="#8f6cf0"/><stop offset="1" stopColor="#2fb985"/></linearGradient></defs><path d="M112 82H1088"/><path d="M112 82H1088" className="architecture-flow__rail-progress"/></svg>
      <div className="architecture-flow__nodes">
        {verifiedArchitectureLayers.map(({ number, title, copy, tags, tone, Icon }) => <article key={number} className={`architecture-flow__node architecture-flow__node--${tone}`}>
          <div className="architecture-flow__node-top"><span className="mono">{number}</span><span className="architecture-flow__node-icon"><Icon width={19} height={19}/></span></div>
          <h3>{title}</h3><p>{copy}</p>
          <div className="architecture-flow__tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        </article>)}
      </div>
    </div>
    <div className="architecture-flow__integrity" aria-label="Verified integrity controls"><span>Validated input</span><b>→</b><span>Version-checked transition</span><b>→</b><span>Transactional audit record</span><b>→</b><span>Record-only execution tracking</span></div>
    <aside className="architecture-switch-boundary" aria-labelledby="switch-boundary-title">
      <div className="architecture-switch-boundary__connector" aria-hidden="true"/>
      <div className="architecture-switch-boundary__status mono">{plannedSwitchBoundary.status}</div>
      <div><p className="eyebrow">External integration boundary</p><h3 id="switch-boundary-title">{plannedSwitchBoundary.title}</h3><p>{plannedSwitchBoundary.copy}</p></div>
      <div className="architecture-switch-boundary__facts"><span>Server-side only</span><span>No browser credentials</span><span>No active request</span></div>
    </aside>
  </section>;
}
