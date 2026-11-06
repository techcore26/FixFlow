"use client";

import { useState } from "react";
import type { IncidentDetails } from "@/lib/types";
import { createPostmortem, createRcaDraft } from "@/lib/postmortem";
import { workspacePhases, type WorkspacePhaseId } from "@/lib/incident-presentation";
import { api } from "@/lib/fixflow-api";
import { shortId } from "@/lib/format";
import { OperationalButton } from "./operational-button";
import { WorkspaceActivityLog } from "./workspace-activity-log";

function download(name: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: "text/markdown" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }

/** The one workspace export control; its persisted-record Markdown contract is unchanged. */
export function WorkspaceExportLogButton({ data }: { data: IncidentDetails }) {
  return <OperationalButton onClick={() => download(`${shortId(data.incident.id)}-postmortem.md`, createPostmortem(data))}>Export Log</OperationalButton>;
}

export function WorkspacePhaseCtas({ data, phase, onChanged, onActivityRefreshed, activityActive = phase === "activity-log" }: { data: IncidentDetails; phase: WorkspacePhaseId; onChanged: () => Promise<void>; onActivityRefreshed: () => Promise<IncidentDetails>; activityActive?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const definition = workspacePhases.find(item => item.id === phase)!;
  const action = async (path: string, body: unknown) => { setBusy(true); setError(""); try { await api.action(data.incident.id, path, body); await onChanged(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed"); } finally { setBusy(false); } };
  const isClosed = data.incident.status === "CLOSED";
  return <>{phase !== "activity-log" && <section className={`workspace-phase-ctas workspace-phase-ctas--${definition.ctas.length}`} aria-label={`${definition.phase} actions`}><div className="workspace-phase-ctas__heading"><p className="eyebrow">{definition.phase} actions</p><h3>{definition.label}</h3></div><div className="workspace-phase-ctas__actions">
    {definition.ctas.filter(cta => cta.id !== "export-log").map(cta => {
      if (cta.id === "acknowledge") return <ActionItem key={cta.id} description={isClosed?"Closed incidents are immutable; acknowledgement is unavailable.":cta.description}><OperationalButton disabled={busy || isClosed} onClick={() => void action("acknowledge", { expectedVersion: data.incident.version })}>Acknowledge</OperationalButton></ActionItem>;
      if (cta.id === "generate-rca") return <ActionItem key={cta.id} description={cta.description}><OperationalButton tone="secondary" onClick={() => download(`${shortId(data.incident.id)}-rca-draft.md`, createRcaDraft(data))}>Generate RCA Draft</OperationalButton></ActionItem>;
      if (cta.id === "manual-note") return null;
      if (cta.capability === "unavailable") return <ActionItem key={cta.id} description={cta.description} unavailable><OperationalButton disabled>{cta.label}</OperationalButton></ActionItem>;
      return <ActionItem key={cta.id} description={cta.description} informational />;
    })}
  </div>{isClosed && definition.ctas.some(cta => cta.id === "acknowledge" || cta.id === "manual-note") && <p className="workspace-phase-ctas__notice">Closed incidents are immutable; acknowledgement and notes are unavailable.</p>}{error && <p role="alert" className="workspace-phase-ctas__error">{error}</p>}</section>}
  <WorkspaceActivityLog key="activity-log" data={data} active={activityActive} onRefreshed={onActivityRefreshed} />
  </>;
}
function ActionItem({children,description,unavailable=false,informational=false}:{children?:React.ReactNode;description:string;unavailable?:boolean;informational?:boolean}){return <article className={`workspace-cta-item${unavailable?" is-unavailable":""}${informational?" is-informational":""}`}><div className="workspace-cta-item__control">{children||<span>Available in the state-aware workflow panel below.</span>}</div><small>{description}</small></article>}
