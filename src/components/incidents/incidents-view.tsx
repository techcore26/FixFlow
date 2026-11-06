"use client";
import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fixflow-api";
import type { Incident } from "@/lib/types";
import { dateTime,elapsed,humanize,shortId } from "@/lib/format";
import { filterAndSortIncidents,incidentSummary,type IncidentListFilter } from "@/lib/incident-presentation";
import { AuditIcon,ClockIcon,FilterIcon,IncidentIcon,SearchIcon,ShieldIcon,SignalIcon } from "../ui/icons";
import { StatusBadge } from "../ui/status-badge";
import { CreateIncidentDialog } from "./create-incident-dialog";
import { OperationalButton } from "./operational-button";

const initialFilter:IncidentListFilter={query:"",severity:"ALL",status:"ALL",scope:"ALL",sort:"NEWEST"};
export function IncidentsView(){
  const[items,setItems]=useState<Incident[]>([]),[filter,setFilter]=useState(initialFilter),[open,setOpen]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{setError("");try{setItems(await api.incidents())}catch(e){setError(e instanceof Error?e.message:"Unable to load incidents")}finally{setLoading(false)}},[]);
  useEffect(()=>{let active=true;api.incidents().then(data=>{if(active)setItems(data)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Unable to load incidents")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
  const shown=useMemo(()=>filterAndSortIncidents(items,filter),[items,filter]),summary=incidentSummary(items),hasFilters=filter.query!==""||filter.severity!=="ALL"||filter.status!=="ALL"||filter.scope!=="ALL";
  function update<K extends keyof IncidentListFilter>(key:K,value:IncidentListFilter[K]){setFilter(current=>({...current,[key]:value}))}
  function applySummary(scope:IncidentListFilter["scope"]){setFilter({...initialFilter,scope})}
  return <div className="incident-list">
    <section className="incident-summary" aria-label="Incident summary">
      <Summary label="All records" value={summary.total} detail="Persisted incidents" icon={IncidentIcon} active={filter.scope==="ALL"} onClick={()=>applySummary("ALL")}/>
      <Summary label="Active" value={summary.active} detail="Needs attention" icon={SignalIcon} active={filter.scope==="ACTIVE"} onClick={()=>applySummary("ACTIVE")}/>
      <Summary label="Critical" value={summary.critical} detail="Active critical" icon={IncidentIcon} active={filter.scope==="CRITICAL"} onClick={()=>applySummary("CRITICAL")}/>
      <Summary label="Approval" value={summary.awaitingApproval} detail="Human decision" icon={ShieldIcon} active={filter.scope==="APPROVAL"} onClick={()=>applySummary("APPROVAL")}/>
      <Summary label="Completed" value={summary.closed} detail="Resolved or closed" icon={AuditIcon} active={filter.scope==="COMPLETED"} onClick={()=>applySummary("COMPLETED")}/>
    </section>
    <section className="incident-list__controls" aria-label="Incident search and filters">
      <label className="incident-search"><SearchIcon width={17}/><span className="sr-only">Search incidents</span><input value={filter.query} onChange={event=>update("query",event.target.value)} placeholder="Search ID, title, or description…"/></label>
      <label className="incident-select"><FilterIcon width={15}/><span className="sr-only">Severity</span><select value={filter.severity} onChange={event=>update("severity",event.target.value as IncidentListFilter["severity"])}><option value="ALL">All severities</option>{["CRITICAL","HIGH","MEDIUM","LOW"].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className="incident-select"><span className="sr-only">Status</span><select value={filter.status} onChange={event=>update("status",event.target.value as IncidentListFilter["status"])}><option value="ALL">All statuses</option>{["OPEN","INVESTIGATING","AWAITING_APPROVAL","APPROVED","EXECUTING","RESOLVED","CLOSED","REJECTED","FAILED","NO_ACTION_REQUIRED"].map(value=><option key={value} value={value}>{humanize(value)}</option>)}</select></label>
      <label className="incident-select"><span className="sr-only">Sort incidents</span><select value={filter.sort} onChange={event=>update("sort",event.target.value as IncidentListFilter["sort"])}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="UPDATED">Recently updated</option><option value="SEVERITY">Highest severity</option><option value="TITLE">Title A–Z</option></select></label>
      {hasFilters&&<OperationalButton tone="quiet" onClick={()=>setFilter(initialFilter)}>Clear filters</OperationalButton>}
      <OperationalButton className="incident-list__create ml-auto" onClick={()=>setOpen(true)}>＋ New incident</OperationalButton>
    </section>
    {error&&<div role="alert" className="incident-error"><div><p className="font-semibold">Incident data could not be loaded.</p><p className="mt-1 text-xs">{error}</p></div><OperationalButton tone="secondary" onClick={()=>void load()}>Retry</OperationalButton></div>}
    <section className="incident-table-shell" aria-labelledby="incident-table-title">
      <div className="incident-table__header"><div><p className="eyebrow">Operational records</p><h2 id="incident-table-title" className="mt-1 text-lg font-semibold">{hasFilters?"Filtered incidents":"All incidents"}</h2></div><p className="text-xs text-[var(--muted)]">{loading?"Loading…":`${shown.length} of ${items.length} record${items.length===1?"":"s"}`}</p></div>
      {loading?<ListLoading/>:shown.length===0?<ListEmpty filtered={hasFilters} onClear={()=>setFilter(initialFilter)} onCreate={()=>setOpen(true)}/>:<div className="overflow-x-auto"><table className="incident-table"><thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Updated</th><th>Opened</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{shown.map(item=><tr key={item.id}><td data-label="Incident"><Link className="incident-table__primary" href={`/incidents/${item.id}`}><span className="mono">{shortId(item.id)}</span><b>{item.title}</b><small>{item.description}</small></Link></td><td data-label="Severity"><StatusBadge value={item.severity}/></td><td data-label="Status"><StatusBadge value={item.status}/></td><td data-label="Updated"><span className="incident-table__time"><ClockIcon width={13}/>{elapsed(item.updatedAt)} ago</span></td><td data-label="Opened"><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></td><td><Link href={`/incidents/${item.id}`} aria-label={`Open ${item.title}`} className="incident-row-link">→</Link></td></tr>)}</tbody></table>{shown.length===1&&<p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">One persisted incident matches this view.</p>}</div>}
    </section>
    <CreateIncidentDialog open={open} onClose={()=>setOpen(false)} onCreated={()=>void load()}/>
  </div>
}

function Summary({label,value,detail,icon:Icon,active,onClick}:{label:string;value:number;detail:string;icon:typeof IncidentIcon;active:boolean;onClick:()=>void}){return <button className="incident-summary__card" aria-pressed={active} onClick={onClick}><span className="incident-summary__icon"><Icon width={17}/></span><span><b className="serif">{value}</b><small>{label}</small><em>{detail}</em></span></button>}
function ListLoading(){return <div aria-label="Loading incidents" className="incident-list__loading">{[1,2,3].map(index=><div key={index} className="grid animate-pulse grid-cols-[1fr_90px_130px_100px_120px] gap-4 rounded-xl p-3"><span className="h-11 rounded-lg bg-violet-50"/><span className="h-6 rounded-full bg-violet-50"/><span className="h-6 rounded-full bg-violet-50"/><span className="h-6 rounded-lg bg-violet-50"/><span className="h-6 rounded-lg bg-violet-50"/></div>)}</div>}
function ListEmpty({filtered,onClear,onCreate}:{filtered:boolean;onClear:()=>void;onCreate:()=>void}){return <div className="incident-list__empty"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600"><IncidentIcon/></span><h3>{filtered?"No records match these filters":"No incidents yet"}</h3><p>{filtered?"Try a broader query or clear the selected severity and status.":"Create the first incident when an operational issue needs a durable, reviewable record."}</p><div>{filtered&&<OperationalButton tone="secondary" onClick={onClear}>Clear filters</OperationalButton>}<OperationalButton onClick={onCreate}>New incident</OperationalButton></div></div>}
