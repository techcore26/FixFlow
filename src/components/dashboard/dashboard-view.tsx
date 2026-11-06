"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fixflow-api";
import type { Incident, IncidentStatus } from "@/lib/types";
import { activeStatuses, dashboardMetrics, matchesDashboardFilter, severityTargetMinutes, type DashboardFilter } from "@/lib/dashboard-metrics";
import { dateTime, elapsed, humanize, shortId } from "@/lib/format";
import { ArrowIcon, AuditIcon, IncidentIcon, SignalIcon, ShieldIcon } from "../ui/icons";
import { SimulationLabel } from "../ui/simulation-label";
import { StatusBadge } from "../ui/status-badge";
import { TrendChart } from "./trend-chart";
import { ServiceMap } from "./service-map";

const pipeline: IncidentStatus[] = ["OPEN", "INVESTIGATING", "AWAITING_APPROVAL", "APPROVED", "EXECUTING", "RESOLVED", "CLOSED"];
const kpis = [
  { key: "ACTIVE" as const, label: "Active incidents", context: "Needs operational attention", icon: SignalIcon, tone: "from-pink-100/80 to-rose-50/70" },
  { key: "CRITICAL" as const, label: "Critical now", context: "Active critical severity", icon: IncidentIcon, tone: "from-orange-100/80 to-amber-50/70" },
  { key: "AWAITING_APPROVAL" as const, label: "Awaiting approval", context: "Human decision required", icon: ShieldIcon, tone: "from-violet-100/80 to-indigo-50/70" },
  { key: "RESOLVED" as const, label: "Resolved records", context: "Resolved, closed, or no action", icon: AuditIcon, tone: "from-emerald-100/80 to-teal-50/70" },
];

export type DashboardDataState = "loading" | "loaded" | "empty" | "error";
export function dashboardDataState(loading: boolean, hasError: boolean, count: number): DashboardDataState {
  if (loading) return "loading";
  if (hasError) return "error";
  return count === 0 ? "empty" : "loaded";
}

export function DashboardView() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("ALL");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    api.incidents().then((data) => { if (active) setItems(data); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load incidents"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const metrics = dashboardMetrics(items);
  const dataState = dashboardDataState(loading, Boolean(error), items.length);
  const unavailable = dataState === "error";
  const filtered = useMemo(() => items.filter((item) => matchesDashboardFilter(item, filter)), [items, filter]);
  const values: Record<string, number> = { ACTIVE: metrics.active, CRITICAL: metrics.critical, AWAITING_APPROVAL: metrics.awaitingApproval, RESOLVED: metrics.resolved };
  function toggle(next: DashboardFilter) { setFilter((current) => current === next ? "ALL" : next); }

  return <div className="dashboard-grid">
    {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => location.reload()} className="font-semibold underline">Retry</button></div>}
    <div className="dashboard-intro"><div><p className="eyebrow">Live local workspace</p><p className="dashboard-intro__summary">{dataState === "loading" ? "Loading persisted workspace…" : unavailable ? "Incident records are temporarily unavailable." : dataState === "empty" ? "No persisted incident records yet." : `${metrics.active} active · ${metrics.critical} critical · ${metrics.awaitingApproval} awaiting approval`}</p></div><Link href="/incidents" className="dashboard-intro__action">Manage incidents <ArrowIcon width={16}/></Link></div>
    <section aria-label="Incident summaries" className="dashboard-kpis dashboard-kpis--classic">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const selected = filter === kpi.key;
        return <button key={kpi.key} type="button" aria-pressed={selected} onClick={() => toggle(kpi.key)} className={`dashboard-kpi bg-gradient-to-br ${kpi.tone}`}>
          <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-[var(--ink-soft)]">{kpi.label}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{selected ? "Click to clear filter" : kpi.context}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-violet-700"><Icon width={17}/></span></div>
          {dataState === "loading" ? <span className="mt-6 block h-9 w-16 animate-pulse rounded-xl bg-white/75"/> : unavailable ? <p aria-label="Metric unavailable" className="serif mt-5 text-5xl leading-none tracking-[-.04em]">—</p> : <p className="serif mt-5 text-5xl leading-none tracking-[-.04em]">{values[kpi.key]}</p>}
          <span className="mono absolute bottom-4 right-4 text-[8px] uppercase tracking-wider text-[var(--faint)]">View records →</span>
        </button>;
      })}
    </section>
    <section className="dashboard-panel dashboard-pipeline-panel" aria-labelledby="pipeline-title"><div className="dashboard-panel__heading"><div><p className="eyebrow">Current flow</p><h2 id="pipeline-title">Workflow pipeline</h2></div><button className="dashboard-panel__utility" onClick={() => setFilter("ALL")}>{filter === "ALL" ? "All incident states" : "Clear selected filter"}</button></div><div className="dashboard-pipeline">{pipeline.map((status, index) => { const count = items.filter((item) => item.status === status).length; const selected = filter === status; return <button key={status} aria-pressed={selected} data-populated={!unavailable && count > 0} disabled={unavailable} onClick={() => toggle(status)}><span className="dashboard-pipeline__count"><b className="serif">{dataState === "loaded" || dataState === "empty" ? count : "—"}</b><span className="mono">0{index + 1}</span></span><span className="dashboard-pipeline__label">{humanize(status)}</span></button>; })}</div></section>
    <div className="dashboard-split dashboard-split--signal"><section className="dashboard-panel dashboard-chart-panel" aria-labelledby="trend-title"><div className="dashboard-panel__heading"><div><p className="eyebrow">Persisted records</p><h2 id="trend-title">Incident creation trend</h2></div><span className="dashboard-period mono">Last 7 days · daily count</span></div>{unavailable ? <UnavailableRecords area="trend"/> : <TrendChart data={metrics.trend}/>}</section><section className="dashboard-panel dashboard-service-panel"><ServiceMap/></section></div>
    <div className="dashboard-split dashboard-split--operations">
      <section className="dashboard-panel dashboard-recent-panel" aria-labelledby="recent-title"><div className="dashboard-recent-panel__heading"><div><p className="eyebrow">Operational queue</p><h2 id="recent-title">{filter === "ALL" ? "Recent incidents" : humanize(filter)}</h2></div><div><span>{unavailable ? "Unavailable" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}</span><Link href="/incidents">View all <ArrowIcon width={12}/></Link></div></div>{dataState === "loading" ? <TableLoading/> : unavailable ? <UnavailableRecords area="queue"/> : filtered.length === 0 ? <EmptyState filtered={filter !== "ALL"} clear={() => setFilter("ALL")}/> : <div className="dashboard-table-scroll"><table className="dashboard-table"><thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Opened</th></tr></thead><tbody>{filtered.slice(0, 6).map((item) => <tr key={item.id}><td data-label="Incident"><Link href={`/incidents/${item.id}`} className="dashboard-table__incident"><span className="mono">{shortId(item.id)}</span><b>{item.title}</b>{item.description && <small>{item.description}</small>}</Link></td><td data-label="Severity"><StatusBadge value={item.severity}/></td><td data-label="Status"><StatusBadge value={item.status}/></td><td data-label="Opened"><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></td></tr>)}</tbody></table></div>}</section>
      <section className="dashboard-panel dashboard-targets-panel" aria-labelledby="timers-title"><div className="dashboard-panel__heading"><div><p className="eyebrow">Response watch</p><h2 id="timers-title">Local targets</h2></div><SimulationLabel>Demo policy</SimulationLabel></div><p className="dashboard-targets-panel__disclosure">Elapsed time is real. Targets are illustrative local thresholds by severity—not production SLAs.</p>{unavailable ? <UnavailableRecords area="local targets"/> : <div className="dashboard-targets">{items.filter((item) => activeStatuses.includes(item.status)).slice(0, 5).map((item) => { const used = (now - new Date(item.createdAt).getTime()) / 60000; const target = severityTargetMinutes[item.severity]; const pct = Math.min(100, Math.max(2, (used / target) * 100)); return <div className="dashboard-timer" key={item.id}><Link href={`/incidents/${item.id}`}>{item.title}</Link><span className="mono">{elapsed(item.createdAt, now)} / {formatTarget(target)}</span><div className="dashboard-timer__bar" aria-label={`${Math.round(pct)} percent of local target elapsed`}><span style={{ width: `${pct}%` }} className={pct >= 100 ? "!bg-rose-500" : ""}/></div></div>; })}{!items.some((item) => activeStatuses.includes(item.status)) && <div className="dashboard-targets__empty"><p>No active timers</p><span>No active incident currently consumes a local target.</span></div>}</div>}</section>
    </div>
  </div>;
}

function formatTarget(minutes: number) { return minutes >= 1440 ? `${minutes / 1440}d` : minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`; }
function TableLoading() { return <div aria-label="Loading incidents" className="space-y-1 p-4">{[1, 2, 3].map((index) => <div key={index} className="grid animate-pulse grid-cols-[1fr_90px_130px_100px] gap-4 rounded-xl p-3"><span className="h-9 rounded-lg bg-violet-50"/><span className="h-6 rounded-full bg-violet-50"/><span className="h-6 rounded-full bg-violet-50"/><span className="h-6 rounded-lg bg-violet-50"/></div>)}</div>; }
function UnavailableRecords({ area }: { area: string }) { return <div role="status" className="p-6 text-sm text-[var(--muted)]">Persisted incident records are unavailable, so {area} cannot be shown.</div>; }
function EmptyState({ filtered, clear }: { filtered: boolean; clear: () => void }) { return <div className="p-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600"><IncidentIcon/></span><p className="mt-4 text-sm font-semibold">{filtered ? "No incidents match this view" : "The operational queue is clear"}</p><p className="mt-2 text-xs text-[var(--muted)]">{filtered ? "Choose another pipeline state or clear the filter." : "Create an incident when a new signal needs attention."}</p>{filtered ? <button onClick={clear} className="mt-4 text-xs font-semibold text-violet-700">Clear filter</button> : <Link href="/incidents" className="mt-4 inline-block text-xs font-semibold text-violet-700">Open incident management →</Link>}</div>; }
