"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GlassCard } from "../ui/glass-card";
import { SimulationLabel } from "../ui/simulation-label";

export const tourSteps = [
  { k: "01", title: "Capture the incident", copy: "Open a validated incident record with severity, description, version, and a first audit event.", visual: "Signal captured" },
  { k: "02", title: "Investigate with context", copy: "Record manual findings and a bounded proposed resolution. Switch remains visibly disconnected.", visual: "Findings ready" },
  { k: "03", title: "Put a human in control", copy: "Approve the exact action snapshot, reject it for revision, or decide that no action is required.", visual: "Awaiting approval" },
  { k: "04", title: "Track, never execute", copy: "FixFlow records external/manual progress against the approved snapshot. It runs no command or patch.", visual: "Record-only execution" },
  { k: "05", title: "Close with a complete story", copy: "Export a postmortem generated from the real incident and immutable audit history.", visual: "Audit complete" },
] as const;

export const TOUR_INTERVAL_MS = 3200;
export const tourReadOnlyStatement = "Autoplay changes only this presentation. It never creates, updates, approves, executes, or closes incident data.";
export function nextTourIndex(index:number){return Math.min(index + 1, tourSteps.length - 1)}
export function autoplayAvailable(reducedMotion:boolean){return !reducedMotion}

export function JudgeTour(){
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement|null>>([]);
  const step = tourSteps[index];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(query.matches); if (query.matches) setPlaying(false); };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setInterval(() => setIndex(current => {
      if (current >= tourSteps.length - 1) { setPlaying(false); return current; }
      return nextTourIndex(current);
    }), TOUR_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  function selectStep(next:number, moveFocus=false){
    setIndex(next);
    setPlaying(false);
    if (moveFocus) window.requestAnimationFrame(() => tabs.current[next]?.focus());
  }
  function onTabKeyDown(event:React.KeyboardEvent<HTMLButtonElement>, current:number){
    let next:number|undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (current + 1) % tourSteps.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (current - 1 + tourSteps.length) % tourSteps.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tourSteps.length - 1;
    if (next !== undefined) { event.preventDefault(); selectStep(next, true); }
  }
  function toggleAutoplay(){
    if (!autoplayAvailable(reducedMotion)) return;
    if (!playing && index === tourSteps.length - 1) setIndex(0);
    setPlaying(current => !current);
  }

  return <div className="demo-tour mx-auto max-w-6xl">
    <div className="demo-tour__header"><div><p className="eyebrow">Judge walkthrough · Read-only</p><h2>The whole story in <span className="serif prism-text">90 seconds.</span></h2></div><button type="button" onClick={toggleAutoplay} aria-pressed={playing} aria-label={reducedMotion ? "Autoplay unavailable while reduced motion is enabled" : playing ? "Pause Demo Tour autoplay" : "Start Demo Tour autoplay"} disabled={reducedMotion} data-playing={playing} className="demo-tour__autoplay">{reducedMotion ? "Autoplay unavailable" : playing ? "❚❚ Pause tour" : "▶ Play tour"}</button></div>
    <p className="demo-tour__disclosure">{tourReadOnlyStatement}</p>
    <div className="demo-tour__body"><div className="demo-tour__tabs" role="tablist" aria-label="Demo Tour steps">{tourSteps.map((item, itemIndex) => <button ref={node => { tabs.current[itemIndex] = node; }} id={`demo-tour-tab-${item.k}`} key={item.k} type="button" role="tab" aria-selected={itemIndex === index} aria-controls={`demo-tour-panel-${item.k}`} tabIndex={itemIndex === index ? 0 : -1} onClick={() => selectStep(itemIndex)} onKeyDown={event => onTabKeyDown(event, itemIndex)}><span className="mono">{item.k}</span><span>{item.title}</span></button>)}</div>
      <div className="demo-tour__showcase prism-border"><GlassCard className="demo-tour__frame"><div id={`demo-tour-panel-${step.k}`} role="tabpanel" aria-labelledby={`demo-tour-tab-${step.k}`} tabIndex={0} className="demo-tour__surface soft-grid"><div className="demo-tour__orb demo-tour__orb--pink" aria-hidden="true"/><div className="demo-tour__orb demo-tour__orb--blue" aria-hidden="true"/><div className="demo-tour__content"><div className="demo-tour__panel-meta"><SimulationLabel>Guided demonstration</SimulationLabel><span className="mono">{step.k} / 05</span></div><h3>{step.title}</h3><p>{step.copy}</p></div><div className="demo-tour__panel-footer"><div className="demo-tour__state"><p className="mono">DEMO STATE</p><p>{step.visual}</p></div><div className="demo-tour__progress" aria-hidden="true">{tourSteps.map((_, progressIndex) => <span key={progressIndex} data-active={progressIndex === index}/>)}</div></div></div></GlassCard></div>
    </div><div className="demo-tour__links"><Link href="/dashboard" className="glass">Open live dashboard →</Link><Link href="/incidents" className="glass">Manage real incidents →</Link><Link href="/architecture" className="glass">Explain the architecture →</Link></div>
  </div>;
}
