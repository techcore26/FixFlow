"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/fixflow-api";
import { dateTime, humanize } from "@/lib/format";
import { activityLogSummary, manualNotesFromAuditEvents } from "@/lib/incident-presentation";
import type { IncidentDetails } from "@/lib/types";
import { OperationalButton } from "./operational-button";

export function WorkspaceActivityLog({ data, active, onRefreshed }: { data: IncidentDetails; active: boolean; onRefreshed: () => Promise<IncidentDetails> }) {
  const notes = useMemo(() => manualNotesFromAuditEvents(data.auditEvents), [data.auditEvents]);
  const summary = useMemo(() => activityLogSummary(data.auditEvents), [data.auditEvents]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const selectedIndex = Math.max(0, notes.findIndex(note => note.id === selectedId));
  const selected = notes[selectedIndex] ?? null;

  useEffect(() => { if (editing) editorRef.current?.focus(); }, [editing]);

  const save = async () => {
    if (!draft.trim() || busy || data.incident.status === "CLOSED") return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.action(data.incident.id, "note", { expectedVersion: data.incident.version, note: draft });
      const refreshed = await onRefreshed();
      const refreshedNotes = manualNotesFromAuditEvents(refreshed.auditEvents);
      const newest = refreshedNotes.at(-1);
      setSelectedId(newest?.id ?? null);
      setDraft(""); setEditing(false); setNotice("Note saved to the incident audit history.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save note. Your draft is still here."); }
    finally { setBusy(false); }
  };
  const startDraft = () => { setEditing(true); setError(""); setNotice(""); };
  const select = (offset: number) => { if (editing || busy) return; const next = notes[selectedIndex + offset]; if (next) setSelectedId(next.id); };
  const closed = data.incident.status === "CLOSED";

  return <section className="workspace-activity-log" hidden={!active} aria-label="Timeline activity actions">
    <div className="workspace-activity-log__layout">
      <div className="workspace-activity-log__left">
        <section className="workspace-activity-log__summary" aria-labelledby="activity-summary-title"><p className="eyebrow">Activity summary</p><h3 id="activity-summary-title">Recorded activity</h3><div className="workspace-activity-log__counts"><span>Audit events<b>{summary.auditEventCount}</b></span><span>Saved notes<b>{summary.manualNoteCount}</b></span></div><div className="workspace-activity-log__latest"><p>Latest activity</p>{summary.latestEvent ? <><b>{humanize(summary.latestEvent.eventType)}</b><time>{dateTime(summary.latestEvent.createdAt)}</time><small>{summary.latestEvent.actor || "No actor recorded"}</small></> : <span>No audit activity has been recorded.</span>}</div><small className="workspace-activity-log__provenance">Derived from persisted audit records.</small></section>
      </div>
      <section className="workspace-operator-notes" aria-labelledby="operator-notes-title"><header><div><p className="eyebrow">Operator notes</p><h3 id="operator-notes-title">Persisted notes</h3></div><button type="button" className="workspace-operator-notes__add" onClick={startDraft} disabled={busy || closed} aria-label="Create a new manual note" title={closed ? "Closed incidents are immutable" : "Create a new manual note"}>+</button></header><div className="workspace-operator-notes__body">{editing ? <label><span>New note</span><textarea ref={editorRef} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={8} placeholder="Record a local operator note in the audit history." /><small>{closed ? "Closed incidents are immutable; notes are unavailable." : "Saved notes are version-checked and do not change workflow state."}</small><OperationalButton tone="secondary" disabled={busy || closed || !draft.trim()} onClick={() => void save()}>{busy ? "Saving…" : "Save Note"}</OperationalButton></label> : selected ? <article><p>{selected.note}</p><footer><time>{dateTime(selected.createdAt)}</time><span>{selected.actor || "No actor recorded"}</span></footer></article> : <p className="workspace-operator-notes__empty">No notes have been saved. Use + to add a local, audited note.</p>}</div>{error && <p role="alert" className="workspace-operator-notes__error">{error}</p>}{notice && <p role="status" className="workspace-operator-notes__notice">{notice}</p>}<footer className="workspace-operator-notes__nav"><button type="button" onClick={() => select(-1)} disabled={editing || busy || selectedIndex === 0 || !notes.length} aria-label="Previous saved note">←</button><p aria-live="polite">{notes.length ? `${selectedIndex + 1} / ${notes.length}` : "0 / 0"}</p><button type="button" onClick={() => select(1)} disabled={editing || busy || selectedIndex >= notes.length - 1 || !notes.length} aria-label="Next saved note">→</button></footer></section>
    </div>
  </section>;
}
