/* eslint-disable react-hooks/set-state-in-effect -- initial API hydration is intentionally client-side. */
"use client";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";
import { api } from "@/lib/fixflow-api";
import type { IncidentDetails } from "@/lib/types";
import { createPostmortem } from "@/lib/postmortem";
import { dateTime,elapsed,shortId } from "@/lib/format";
import { DownloadIcon } from "../ui/icons";
import { StatusBadge } from "../ui/status-badge";
import { IncidentWorkflowPipeline } from "./incident-workflow-pipeline";
import { OperationalButton } from "./operational-button";
import { IncidentPhaseBoard } from "./incident-phase-board";
import { IncidentContextSidebar } from "./incident-context-sidebar";

export function IncidentDetailView({id}:{id:string}){const[data,setData]=useState<IncidentDetails|null>(null),[error,setError]=useState("");const load=useCallback(async()=>{setError("");try{setData(await api.incident(id))}catch(e){setError(e instanceof Error?e.message:"Unable to load incident")}},[id]);useEffect(()=>{void load()},[load]);function exportFile(){if(!data)return;const blob=new Blob([createPostmortem(data)],{type:"text/markdown"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`${shortId(data.incident.id)}-postmortem.md`;anchor.click();URL.revokeObjectURL(url)}if(error)return <div role="alert" className="incident-error"><div><b>Incident details could not be loaded.</b><p>{error}</p></div><OperationalButton tone="secondary" onClick={()=>void load()}>Retry</OperationalButton></div>;if(!data)return <DetailLoading/>;const incident=data.incident;return <div className="incident-intelligence"><section className="incident-intelligence__summary"><div className="incident-command__toolbar"><Link href="/incidents" className="workspace-back">← Incident queue</Link><div className="flex flex-wrap gap-2"><OperationalButton tone="secondary" onClick={exportFile}><DownloadIcon width={16}/>Export</OperationalButton><Link href={`/incidents/${id}/workspace`} className="workspace-open">Open Workspace →</Link></div></div><header><div><div className="flex flex-wrap items-center gap-2"><span className="mono incident-identity">{shortId(id)}</span><StatusBadge value={incident.severity}/><StatusBadge value={incident.status}/></div><h1>{incident.title}</h1><p>{incident.description}</p></div><dl className="incident-command__facts"><Fact label="Opened" value={dateTime(incident.createdAt)}/><Fact label="Elapsed" value={elapsed(incident.createdAt)}/><Fact label="Version" value={`v${incident.version}`}/><Fact label="Mode" value="Read-only"/></dl></header><div className="incident-intelligence__progress"><IncidentWorkflowPipeline details={data}/></div></section><div className="incident-intelligence__lower"><IncidentPhaseBoard data={data}/><IncidentContextSidebar data={data}/></div></div>}
function Fact({label,value}:{label:string;value:string}){return <div><dt>{label}</dt><dd>{value}</dd></div>}
function DetailLoading(){return <div aria-label="Loading incident intelligence" className="space-y-4"><div className="h-72 animate-pulse rounded-[32px] bg-white/65"/><div className="grid gap-4 lg:grid-cols-3"><div className="h-96 animate-pulse rounded-[26px] bg-white/65"/><div className="h-96 animate-pulse rounded-[26px] bg-white/65"/><div className="h-96 animate-pulse rounded-[26px] bg-white/65"/></div></div>}
