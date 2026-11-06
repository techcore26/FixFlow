"use client";

import type { KeyboardEvent } from "react";
import { workspaceChannels, type WorkspaceChannelId } from "@/lib/incident-presentation";

export function WorkspaceChannelNav({ active, onChange }: { active: WorkspaceChannelId; onChange: (channel: WorkspaceChannelId) => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = workspaceChannels.length - 1;
    else next = (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + workspaceChannels.length) % workspaceChannels.length;
    const channel = workspaceChannels[next].id;
    onChange(channel);
    document.getElementById(`workspace-channel-${channel}`)?.focus();
  }

  return <nav className="workspace-channels" aria-label="Incident workspace sections"><p className="workspace-channels__label">Incident workspace</p><div role="tablist">{workspaceChannels.map(({ id, phase, label }, index) => <button id={`workspace-channel-${id}`} key={id} type="button" role="tab" aria-selected={active === id} aria-controls="workspace-channel-panel" tabIndex={active === id ? 0 : -1} onClick={() => onChange(id)} onKeyDown={event => onKeyDown(event, index)}><span aria-hidden="true">#</span><span className="workspace-channels__copy"><small>{phase}</small>{label}</span></button>)}</div><div className="workspace-channels__note"><b>Local operator</b><span>Switch disconnected</span></div></nav>;
}
