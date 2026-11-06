/* eslint-disable react-hooks/set-state-in-effect -- initial API hydration is intentionally client-side. */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fixflow-api";
import type { IncidentDetails } from "@/lib/types";
import { currentWorkflowStep, type WorkspaceChannelId, workflowActionPhaseFor, workspaceChannels, workspacePhaseFor } from "@/lib/incident-presentation";
import { shortId } from "@/lib/format";
import { StatusBadge } from "../ui/status-badge";
import { OperationalButton } from "./operational-button";
import { WorkspaceChannelNav } from "./workspace-channel-nav";
import { IncidentRecordSections } from "./incident-record-sections";
import { WorkflowActions } from "./workflow-actions";
import { WorkspaceExportLogButton, WorkspacePhaseCtas } from "./workspace-phase-ctas";
import { IncidentContextSidebar } from "./incident-context-sidebar";

export function IncidentWorkspaceView({ id }: { id: string }) {
  const [data, setData] = useState<IncidentDetails | null>(null);
  const [active, setActive] = useState<WorkspaceChannelId>("overview");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const next = await api.incident(id);
    setData(next);
    return next;
  }, [id]);
  const load = useCallback(async () => {
    setError("");
    try {
      const next = await refresh();
      setActive(workspacePhaseFor(next));
      setInitialized(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workspace");
    }
  }, [refresh]);

  useEffect(() => { if (!initialized) void load(); }, [initialized, load]);
  if (error) return <div role="alert" className="incident-error"><div><b>Workspace could not be loaded.</b><p>{error}</p></div><OperationalButton tone="secondary" onClick={() => void load()}>Retry</OperationalButton></div>;
  if (!data) return <div className="h-96 animate-pulse rounded-[28px] bg-white/65" aria-label="Loading technical workspace" />;

  const incident = data.incident;
  const step = currentWorkflowStep(incident.status);
  const actionPhase = workflowActionPhaseFor(data);
  const phase = workspaceChannels.find(item => item.id === active)!;
  return <div className="workflow-canvas">
    <header className="workflow-canvas__topbar">
      <div className="workflow-canvas__meta"><Link href={`/incidents/${id}`} className="workspace-back">← Incident details</Link><div className="workflow-canvas__identity"><span className="mono">{shortId(id)}</span><StatusBadge value={incident.severity} /><StatusBadge value={incident.status} /><i>v{incident.version}</i></div></div>
      <div className="workflow-canvas__title"><p>Technical incident workspace</p><h1>{incident.title}</h1></div>
      <div className="workflow-canvas__stage"><span>Current stage</span><b>{step.label}</b></div>
    </header>
    <div className="workspace-layout">
      <WorkspaceChannelNav active={active} onChange={setActive} />
      <main id="workspace-channel-panel" role="tabpanel" aria-labelledby={`workspace-channel-${active}`} tabIndex={0} className="workflow-canvas__panel">
        <div className="workflow-canvas__panel-heading"><div><p className="eyebrow">{phase.phase} · #{phase.label}</p><h2>{phase.label}</h2></div>{active === actionPhase && incident.status !== "CLOSED" && <span><i />Valid action available</span>}</div>
        {active === "preserve-log" && <section className="workspace-preserve-log__toolbar" aria-label="Preserve Log export"><WorkspaceExportLogButton data={data} /><p>Downloads the existing Markdown postmortem derived from persisted incident and audit records.</p></section>}
        <WorkspacePhaseCtas data={data} phase={active === "preserve-log" ? "activity-log" : active} activityActive={active === "activity-log"} onChanged={load} onActivityRefreshed={refresh} />
        <div className="workspace-phase-flow">
          {(["investigation", "validate", "execution", "postmortem"] as const).map(action => <div key={action} hidden={active !== action} className={`incident-panel incident-panel--action workspace-action workspace-action--${action}`}><WorkflowActions data={data} onChanged={load} phase={action} /></div>)}
          {phase.content.map(content => <div key={content} className={`workspace-phase-flow__record workspace-phase-flow__record--${content}`}><IncidentRecordSections data={data} channel={content} /></div>)}
        </div>
      </main>
      <IncidentContextSidebar data={data} onActivitySelect={() => setActive("activity-log")} />
    </div>
  </div>;
}
