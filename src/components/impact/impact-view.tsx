"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fixflow-api";
import { dashboardMetrics } from "@/lib/dashboard-metrics";
import { disclosure } from "@/lib/demo-labels";
import type { Incident } from "@/lib/types";
import { GlassCard } from "../ui/glass-card";
import { SimulationLabel } from "../ui/simulation-label";

export const IMPACT_INCIDENTS_PER_MONTH = 4;
export const IMPACT_PROJECTION_DISCLOSURE = "Assumes four incidents monthly. This is not measured savings or a financial projection.";
export function illustrativeCoordinationHours(responders:number, hoursPerIncident:number){return Math.round(responders * hoursPerIncident * IMPACT_INCIDENTS_PER_MONTH)}
export function impactRecordState(state:"loading"|"ready"|"error", count:number){return state === "loading" ? "loading" : state === "error" ? "error" : count === 0 ? "empty" : "loaded"}

const illustrativeMetrics = [["51%", "less coordination drag"], ["$2.6M", "illustrative annual exposure"], ["< 10 sec", "to open a clear workflow"]] as const;

export function ImpactView(){
  const [items, setItems] = useState<Incident[]>([]);
  const [recordState, setRecordState] = useState<"loading"|"ready"|"error">("loading");
  const [team, setTeam] = useState(8);
  const [hours, setHours] = useState(2.5);

  useEffect(() => {
    let current = true;
    api.incidents().then(records => { if (current) { setItems(records); setRecordState("ready"); } }).catch(() => { if (current) setRecordState("error"); });
    return () => { current = false; };
  }, []);

  const metrics = dashboardMetrics(items);
  const projection = illustrativeCoordinationHours(team, hours);
  const state = impactRecordState(recordState, items.length);

  return <div className="impact-view">
    <section className="impact-illustrative-grid" aria-label="Illustrative impact figures">{illustrativeMetrics.map(([number, label]) => <GlassCard key={number} className="impact-illustrative-card"><SimulationLabel>{disclosure.impact}</SimulationLabel><p className="serif prism-text">{number}</p><p>{label}</p></GlassCard>)}</section>
    <div className="impact-workbench">
      <GlassCard className="impact-operational-record"><div><p className="eyebrow">Your local workspace</p><h2>Real operational record</h2></div>
        {state === "loading" && <div className="impact-record-state" role="status">Loading persisted local incident records…</div>}
        {state === "error" && <div className="impact-record-state impact-record-state--error" role="alert">Unable to retrieve local incident records right now. No counts are shown.</div>}
        {(state === "loaded" || state === "empty") && <><div className="impact-record-metrics" aria-live="polite">{[[items.length, "Total incidents"], [metrics.active, "Active"], [metrics.awaitingApproval, "Awaiting approval"], [metrics.resolved, "Resolved / closed"]].map(([number, label]) => <div key={String(label)}><p>{number}</p><span>{label}</span></div>)}</div>{state === "empty" && <p className="impact-record-empty">No local incident records have been created yet.</p>}<p className="impact-record-provenance">Derived from persisted local incident records.</p></>}
      </GlassCard>
      <GlassCard className="impact-explorer"><div className="impact-explorer__heading"><div><p className="eyebrow">Impact explorer</p><h2>What clarity could return</h2></div><SimulationLabel>Illustrative calculator</SimulationLabel></div><p className="impact-explorer__formula mono">Formula · responders × hours × {IMPACT_INCIDENTS_PER_MONTH} incidents/month</p><div className="impact-explorer__controls">
        <label><span><b>Responders involved</b><output>{team}</output></span><input className="accent-violet-500" type="range" min="2" max="30" value={team} onChange={event => setTeam(+event.target.value)}/></label>
        <label><span><b>Hours per incident</b><output>{hours}</output></span><input className="accent-violet-500" type="range" min="0.5" max="12" step="0.5" value={hours} onChange={event => setHours(+event.target.value)}/></label>
      </div><div className="impact-explorer__result" aria-live="polite" aria-atomic="true"><p>Illustrative person-hours coordinated per month</p><output>{projection}</output><small>{IMPACT_PROJECTION_DISCLOSURE}</small></div>
      </GlassCard>
    </div>
  </div>;
}
