"use client";

import { useState } from "react";
import { api } from "@/lib/fixflow-api";
import type { IncidentDetails } from "@/lib/types";
import { nextActionLabel, type WorkspacePhaseId } from "@/lib/incident-presentation";
import { ArrowIcon, AuditIcon, InvestigateIcon, ShieldIcon } from "../ui/icons";
import { disclosure } from "@/lib/demo-labels";
import { OperationalButton } from "./operational-button";

type ActionPhase = Extract<WorkspacePhaseId, "investigation" | "validate" | "execution" | "postmortem">;

export function WorkflowActions({ data, onChanged, phase }: { data: IncidentDetails; onChanged: () => Promise<void>; phase: ActionPhase }) {
  const { incident } = data;
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latestInvestigation = data.investigations.at(-1);
  const latestApproval = [...data.approvals].reverse().find(item => item.decision === "APPROVED");
  const latestExecution = data.executions.at(-1);

  async function act(path: string, body: unknown) {
    setBusy(true); setError("");
    try {
      await api.action(incident.id, path, body);
      setPrimary(""); setSecondary(""); setSummary("");
      await onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed"); }
    finally { setBusy(false); }
  }

  const base = { expectedVersion: incident.version };
  const panel = phase === "investigation"
    ? <InvestigationForm status={incident.status} busy={busy} primary={primary} secondary={secondary} summary={summary} setPrimary={setPrimary} setSecondary={setSecondary} setSummary={setSummary} onAction={act} base={base} investigationId={latestInvestigation?.id} />
    : phase === "validate"
      ? <ValidationForm status={incident.status} busy={busy} rationale={primary} actionSummary={secondary} setRationale={setPrimary} setActionSummary={setSecondary} onAction={act} base={base} investigationId={latestInvestigation?.id} proposedResolution={latestInvestigation?.proposedResolution} />
      : phase === "execution"
        ? <ExecutionForm status={incident.status} busy={busy} trackingNote={primary} outcome={secondary} setTrackingNote={setPrimary} setOutcome={setSecondary} onAction={act} base={base} approvalId={latestApproval?.id} executionId={latestExecution?.id} />
        : <PostmortemForm status={incident.status} busy={busy} summary={primary} setSummary={setPrimary} onAction={act} base={base} />;

  return <div>
    <div className="mb-5 rounded-2xl bg-violet-50/60 p-3"><p className="mono text-[9px] uppercase tracking-wider text-violet-700">Next valid action</p><p className="mt-1 text-xs text-[var(--ink-soft)]">{nextActionLabel(data)}</p></div>
    {panel}{error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  </div>;
}

function InvestigationForm({ status, busy, primary, secondary, summary, setPrimary, setSecondary, setSummary, onAction, base, investigationId }: { status: IncidentDetails["incident"]["status"]; busy: boolean; primary: string; secondary: string; summary: string; setPrimary: (value: string) => void; setSecondary: (value: string) => void; setSummary: (value: string) => void; onAction: (path: string, body: unknown) => Promise<void>; base: { expectedVersion: number }; investigationId?: string }) {
  const editable = status === "INVESTIGATING";
  return <Action icon={<InvestigateIcon />} title="Investigation" note={editable ? disclosure.switch : "Investigation input is available only while the persisted incident is Investigating."}>
    {status === "OPEN" && <div className="workspace-action__inline"><p>Start a manual investigation before recording findings.</p><OperationalButton disabled={busy} onClick={() => void onAction("investigate", base)}>{busy ? "Starting…" : "Start manual investigation"}<ArrowIcon width={16} /></OperationalButton></div>}
    {status === "REJECTED" && <div className="workspace-action__inline"><p>The prior decision is immutable. Start a new investigation revision to edit these fields.</p><OperationalButton disabled={busy} onClick={() => void onAction("investigate", base)}>Revise investigation</OperationalButton></div>}
    {status === "FAILED" && !investigationId && <div className="workspace-action__inline"><p>Restart investigation tracking before recording a new investigation.</p><OperationalButton disabled={busy} onClick={() => void onAction("investigate", base)}>Restart investigation</OperationalButton></div>}
    <Area disabled={!editable || busy} label="Recorded findings" value={primary} onChange={setPrimary} placeholder="What did the operator determine?" />
    <Area disabled={!editable || busy} label="Proposed fix" value={secondary} onChange={setSecondary} placeholder="Describe the proposed bounded resolution for human review." />
    <Area disabled={!editable || busy} label="Investigation summary" value={summary} onChange={setSummary} placeholder="Summarize the key findings briefly." />
    {editable ? <div className="flex flex-wrap gap-2"><OperationalButton disabled={busy || !primary.trim() || !secondary.trim() || !summary.trim()} onClick={() => void onAction("findings", { ...base, investigationId, outcome: "READY_FOR_APPROVAL", findings: primary, proposedResolution: secondary, summary })}>Propose Fix</OperationalButton><OperationalButton tone="secondary" disabled={busy || !primary.trim() || !summary.trim()} onClick={() => void onAction("findings", { ...base, investigationId, outcome: "NO_ACTION_REQUIRED", findings: primary, summary })}>No Action Required</OperationalButton><OperationalButton tone="danger" disabled={busy || !secondary.trim()} onClick={() => void onAction("findings", { ...base, investigationId, outcome: "FAILED", errorMessage: secondary, findings: primary || undefined, summary: summary || undefined })}>Record Investigation Failure</OperationalButton></div> : <Availability status={status} />}
  </Action>;
}

function ValidationForm({ status, busy, rationale, actionSummary, setRationale, setActionSummary, onAction, base, investigationId, proposedResolution }: { status: IncidentDetails["incident"]["status"]; busy: boolean; rationale: string; actionSummary: string; setRationale: (value: string) => void; setActionSummary: (value: string) => void; onAction: (path: string, body: unknown) => Promise<void>; base: { expectedVersion: number }; investigationId?: string; proposedResolution?: string | null }) {
  const editable = status === "AWAITING_APPROVAL";
  return <Action icon={<ShieldIcon />} title="Record validation" note={editable ? "A human decision is limited to the exact immutable action snapshot recorded here." : "Human decision controls are available only while the persisted status is Awaiting Approval."}>
    <Area disabled={!editable || busy} label="Decision rationale" value={rationale} onChange={setRationale} placeholder="Explain the reason for the approval, rejection, or no-action decision." />
    <Area disabled={!editable || busy} label="Exact action summary / approved proposal" value={actionSummary} onChange={setActionSummary} placeholder={proposedResolution || "Specify the exact bounded action being reviewed."} />
    {editable ? <><p role="status" aria-live="polite" className="approval-guidance">{busy ? "Saving the recorded decision…" : !actionSummary.trim() && !rationale.trim() ? "Add an exact action summary to approve, or a decision rationale to reject or mark no action." : !actionSummary.trim() ? "Add an exact action summary to enable approval." : !rationale.trim() ? "Add a decision rationale to enable rejection or no action." : "All decision controls are ready for review."}</p><div className="flex flex-wrap gap-2"><OperationalButton disabled={busy || !actionSummary.trim()} onClick={() => void onAction("approve", { ...base, investigationId, rationale: rationale || undefined, action: { type: "MANUAL_REMEDIATION", summary: actionSummary, parameters: {} } })}>Approve Exact Action</OperationalButton><OperationalButton tone="danger" disabled={busy || !rationale.trim()} onClick={() => void onAction("reject", { ...base, investigationId, rationale })}>Reject for Revision</OperationalButton><OperationalButton tone="secondary" disabled={busy || !rationale.trim()} onClick={() => void onAction("no-action", { ...base, investigationId, rationale })}>No Action Required</OperationalButton></div></> : <Availability status={status} />}
  </Action>;
}

function ExecutionForm({ status, busy, trackingNote, outcome, setTrackingNote, setOutcome, onAction, base, approvalId, executionId }: { status: IncidentDetails["incident"]["status"]; busy: boolean; trackingNote: string; outcome: string; setTrackingNote: (value: string) => void; setOutcome: (value: string) => void; onAction: (path: string, body: unknown) => Promise<void>; base: { expectedVersion: number }; approvalId?: string; executionId?: string }) {
  const canStart = status === "APPROVED";
  const canRecord = status === "EXECUTING";
  const canRetry = status === "FAILED" && Boolean(executionId);
  return <Action icon={<AuditIcon />} title="Next valid action" note="Record-only: FixFlow does not execute infrastructure changes.">
    <Area disabled={!canStart || busy} label="Tracking approved action" value={trackingNote} onChange={setTrackingNote} placeholder="Enter the tracking note for the approved action." />
    {canStart && <OperationalButton disabled={busy || !approvalId} onClick={() => void onAction("execution", { operation: "START", ...base, approvalId, idempotencyKey: `fixflow-${approvalId}`, requestSummary: trackingNote || undefined })}>Start Execution Tracking</OperationalButton>}
    <Area disabled={!canRecord || busy} label="Record-only outcomes" value={outcome} onChange={setOutcome} placeholder="Record the observed outcome without claiming an external action was performed." />
    {canRecord && <div className="flex flex-wrap gap-2"><OperationalButton disabled={busy || !outcome.trim()} onClick={() => void onAction("execution", { operation: "SUCCEED", ...base, executionId, resultSummary: outcome })}>Mark Successful</OperationalButton><OperationalButton tone="danger" disabled={busy || !outcome.trim()} onClick={() => void onAction("execution", { operation: "FAIL", ...base, executionId, errorMessage: outcome })}>Mark Failed</OperationalButton></div>}
    {canRetry && <div className="workspace-action__inline"><p>Retry tracking retains the immutable approval snapshot. The existing execution record is updated; earlier retry details are not separately persisted.</p><OperationalButton disabled={busy} onClick={() => void onAction("execution", { operation: "RETRY", ...base, executionId, requestSummary: trackingNote || undefined })}>Track Retry</OperationalButton></div>}
    {!canStart && !canRecord && !canRetry && <Availability status={status} />}
  </Action>;
}

function PostmortemForm({ status, busy, summary, setSummary, onAction, base }: { status: IncidentDetails["incident"]["status"]; busy: boolean; summary: string; setSummary: (value: string) => void; onAction: (path: string, body: unknown) => Promise<void>; base: { expectedVersion: number } }) {
  const canClose = status === "RESOLVED" || status === "NO_ACTION_REQUIRED";
  return <Action icon={<AuditIcon />} title={canClose ? "Close the incident" : "Closure"} note="Closure preserves the complete audit history and final resolution summary."><Area disabled={!canClose || busy} label="Resolution summary" value={summary} onChange={setSummary} placeholder="Summarize the final outcome." />{canClose ? <OperationalButton disabled={busy || !summary.trim()} onClick={() => void onAction("close", { ...base, resolutionSummary: summary })}>Close Incident</OperationalButton> : <Availability status={status} />}</Action>;
}

function Availability({ status }: { status: IncidentDetails["incident"]["status"] }) { return <p className="workspace-action__availability">The persisted incident is currently {status.replaceAll("_", " ").toLowerCase()}. These fields remain visible, but editing and submission are not valid in this state.</p>; }
function Action({ icon, title, note, children }: { icon: React.ReactNode; title: string; note: string; children: React.ReactNode }) { return <div className="workspace-action__content"><div className="workspace-action__header"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">{icon}</span><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{note}</p></div></div>{children}</div>; }
function Area({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled: boolean }) { return <label className="workspace-action__field"><span>{label}</span><textarea rows={3} maxLength={2000} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="incident-field resize-none text-sm" /></label>; }
