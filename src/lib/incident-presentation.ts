import type { Approval,AuditEvent,Execution,ExecutionAttempt,Incident,IncidentDetails,IncidentStatus,Investigation,Severity } from "./types";

export type IncidentListFilter={query:string;severity:"ALL"|Severity;status:"ALL"|IncidentStatus;scope:"ALL"|"ACTIVE"|"CRITICAL"|"APPROVAL"|"COMPLETED";sort:"NEWEST"|"OLDEST"|"UPDATED"|"SEVERITY"|"TITLE"};
export const primaryWorkflow:IncidentStatus[]=["OPEN","INVESTIGATING","AWAITING_APPROVAL","APPROVED","EXECUTING","RESOLVED","CLOSED"];
const activeStatuses:IncidentStatus[]=["OPEN","INVESTIGATING","AWAITING_APPROVAL","APPROVED","EXECUTING","REJECTED","FAILED"];
const severityRank:Record<Severity,number>={CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1};

export function incidentSummary(items:Incident[]){return{total:items.length,active:items.filter(item=>activeStatuses.includes(item.status)).length,critical:items.filter(item=>item.severity==="CRITICAL"&&activeStatuses.includes(item.status)).length,awaitingApproval:items.filter(item=>item.status==="AWAITING_APPROVAL").length,closed:items.filter(item=>["CLOSED","RESOLVED","NO_ACTION_REQUIRED"].includes(item.status)).length}}
export function filterAndSortIncidents(items:Incident[],filter:IncidentListFilter){const query=filter.query.trim().toLowerCase();return items.filter(item=>{const scopeMatch=filter.scope==="ALL"||(filter.scope==="ACTIVE"&&activeStatuses.includes(item.status))||(filter.scope==="CRITICAL"&&item.severity==="CRITICAL"&&activeStatuses.includes(item.status))||(filter.scope==="APPROVAL"&&item.status==="AWAITING_APPROVAL")||(filter.scope==="COMPLETED"&&["CLOSED","RESOLVED","NO_ACTION_REQUIRED"].includes(item.status));return scopeMatch&&(filter.severity==="ALL"||item.severity===filter.severity)&&(filter.status==="ALL"||item.status===filter.status)&&(!query||`${item.id} ${item.title} ${item.description}`.toLowerCase().includes(query))}).sort((a,b)=>{if(filter.sort==="OLDEST")return new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime();if(filter.sort==="UPDATED")return new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime();if(filter.sort==="SEVERITY")return severityRank[b.severity]-severityRank[a.severity]||new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();if(filter.sort==="TITLE")return a.title.localeCompare(b.title);return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()})}
export function currentWorkflowStep(status:IncidentStatus){if(status==="REJECTED")return{index:2,label:"Decision rejected",branch:true};if(status==="FAILED")return{index:4,label:"Action failed",branch:true};if(status==="NO_ACTION_REQUIRED")return{index:5,label:"No action required",branch:true};const index=primaryWorkflow.indexOf(status);return{index:Math.max(0,index),label:status.replaceAll("_"," "),branch:false}}
export function nextActionLabel(details:IncidentDetails){const{status}=details.incident;if(status==="OPEN")return"Start a manual investigation";if(status==="INVESTIGATING")return"Record findings or no-action outcome";if(status==="AWAITING_APPROVAL")return"Approve, reject, or mark no action";if(status==="APPROVED")return"Start record-only execution tracking";if(status==="EXECUTING")return"Record the manual/external outcome";if(status==="RESOLVED"||status==="NO_ACTION_REQUIRED")return"Close the incident";if(status==="REJECTED")return"Revise the investigation or close";if(status==="FAILED")return details.executions.length?"Retry approved action tracking":"Restart the investigation";return"No further workflow action"}
export function investigationSource(details:IncidentDetails){const latest=details.investigations.at(-1);if(!latest)return{label:"Not started",detail:"No investigation record exists.",kind:"none" as const};if(latest.externalReference)return{label:"External reference",detail:latest.externalReference,kind:"external" as const};return{label:"Manual investigation",detail:"Entered by the local operator. Switch Gateway is not connected.",kind:"manual" as const}}
export type PersistedManualNote={id:string;note:string;actor:string;createdAt:string};
function chronologicalAuditEvents(events:AuditEvent[]){return events.map((event,index)=>({event,index,time:Date.parse(event.createdAt)})).sort((left,right)=>{const leftTime=Number.isNaN(left.time)?0:left.time,rightTime=Number.isNaN(right.time)?0:right.time;return leftTime-rightTime||left.index-right.index}).map(item=>item.event)}
function noteFromMetadata(metadata:string|null){if(!metadata)return null;try{const value=JSON.parse(metadata) as unknown;if(value&&typeof value==="object"){const note=(value as Record<string,unknown>).note;if(typeof note==="string")return note.trim()||null}}catch{}return null}
export function manualNotesFromAuditEvents(events:AuditEvent[]):PersistedManualNote[]{return chronologicalAuditEvents(events).flatMap(event=>{const note=event.eventType==="MANUAL_NOTE_ADDED"?noteFromMetadata(event.metadata):null;return note?[{id:event.id,note,actor:event.actor,createdAt:event.createdAt}]:[]})}
export function activityLogSummary(events:AuditEvent[]){const ordered=chronologicalAuditEvents(events);return{auditEventCount:events.length,manualNoteCount:manualNotesFromAuditEvents(events).length,latestEvent:ordered.at(-1)}}
export type ApprovedSnapshot={type?:string;summary?:string;parameters?:Record<string,string>;raw?:string};
export function parseApprovedSnapshot(approval:Approval):ApprovedSnapshot{try{const value=JSON.parse(approval.proposedActionSnapshot) as unknown;if(value&&typeof value==="object"){const object=value as Record<string,unknown>;return{type:typeof object.type==="string"?object.type:undefined,summary:typeof object.summary==="string"?object.summary:typeof object.proposedResolution==="string"?object.proposedResolution:undefined,parameters:object.parameters&&typeof object.parameters==="object"?object.parameters as Record<string,string>:undefined}}}catch{return{raw:approval.proposedActionSnapshot}}return{raw:approval.proposedActionSnapshot}}

export const workspacePhaseIds=["overview","investigation","validate","execution","activity-log","postmortem"] as const;
export type WorkspacePhaseId=(typeof workspacePhaseIds)[number];
export type WorkspaceChannelId=WorkspacePhaseId|"preserve-log";
export type WorkspaceContentId="overview"|"overview-current"|"investigation"|"proposed-fix"|"approvals"|"execution"|"activity-log"|"preserve-log";
export type WorkspaceCta={id:string;label:string;capability:"existing"|"safe-new"|"unavailable";description:string};
export const workspacePhases=[
  {id:"overview",phase:"TRIAGE",label:"Overview",content:["overview","overview-current"] as WorkspaceContentId[],ctas:[{id:"acknowledge",label:"Acknowledge",capability:"safe-new",description:"Records local acknowledgement in the immutable audit history."},{id:"escalate",label:"Escalate",capability:"unavailable",description:"Requires an authenticated escalation policy and destination."},{id:"declare-major",label:"Declare Major Incident",capability:"unavailable",description:"Requires a defined major-incident model and notification policy."}]},
  {id:"investigation",phase:"DIAGNOSE",label:"Investigate",content:["investigation"] as WorkspaceContentId[],ctas:[{id:"run-diagnostics",label:"Run Diagnostics",capability:"unavailable",description:"Requires a verified diagnostic integration; no diagnostic runner is connected."},{id:"link-related",label:"Link Related Incidents",capability:"unavailable",description:"Requires persisted incident relationships and related-incident APIs."}]},
  {id:"validate",phase:"PLAN",label:"Validate",content:[] as WorkspaceContentId[],ctas:[{id:"propose-fix",label:"Propose Fix",capability:"existing",description:"Records manual findings and a bounded proposal for human approval."},{id:"peer-review",label:"Request Peer Review",capability:"unavailable",description:"Requires authenticated reviewer identities and review records."}]},
  {id:"execution",phase:"FIX",label:"Execution",content:[] as WorkspaceContentId[],ctas:[{id:"execute-rollback",label:"Execute Rollback",capability:"unavailable",description:"FixFlow can track an approved rollback but has no authorized rollback executor."},{id:"deploy-fix",label:"Deploy Fix",capability:"unavailable",description:"Requires an authorized deployment integration and verified results."},{id:"bounce-back",label:"Bounce Back",capability:"unavailable",description:"Requires a defined, approved recovery operation; tracking retry is not execution."}]},
  {id:"activity-log",phase:"TRACK",label:"Activity Log",content:["activity-log"] as WorkspaceContentId[],ctas:[{id:"export-log",label:"Export Log",capability:"existing",description:"Downloads Markdown derived only from the persisted incident record."},{id:"manual-note",label:"Add Manual Note",capability:"safe-new",description:"Adds a local, version-checked audit note without changing workflow state."}]},
  {id:"postmortem",phase:"WRAP-UP",label:"Post-Mortem",content:[] as WorkspaceContentId[],ctas:[{id:"generate-rca",label:"Generate RCA Draft",capability:"safe-new",description:"Creates a clearly labelled local draft from persisted records; it does not infer a root cause."},{id:"close",label:"Close Incident",capability:"existing",description:"Closes only a workflow state that is legally eligible for closure."}]},
] as const satisfies ReadonlyArray<{id:WorkspacePhaseId;phase:string;label:string;content:WorkspaceContentId[];ctas:WorkspaceCta[]}>;
const workspaceChannelPhases=workspacePhases.map(phase=>phase.id==="activity-log"?{...phase,label:"Timeline"}:phase);
export const workspaceChannels=[...workspaceChannelPhases,{id:"preserve-log",phase:"PRESERVE",label:"Preserve Log",content:["preserve-log"] as WorkspaceContentId[],ctas:[] as WorkspaceCta[]}] satisfies ReadonlyArray<{id:WorkspaceChannelId;phase:string;label:string;content:WorkspaceContentId[];ctas:WorkspaceCta[]}>;

export type PreserveLogDecision={approval:Approval;executions:Execution[];attemptsByExecution:Map<string,ExecutionAttempt[]>};
export type PreserveLogGroup={investigation:Investigation;decisions:PreserveLogDecision[]};
export type PreserveLogUngrouped={approvals:Approval[];executions:Execution[];attempts:ExecutionAttempt[]};
export type PreserveLogPresentation={groups:PreserveLogGroup[];ungrouped:PreserveLogUngrouped};

function chronological<T extends { id:string; createdAt:string }>(records:T[]){return records.map((record,index)=>({record,index,time:Date.parse(record.createdAt)})).sort((left,right)=>{const leftTime=Number.isNaN(left.time)?0:left.time,rightTime=Number.isNaN(right.time)?0:right.time;return leftTime-rightTime||left.record.id.localeCompare(right.record.id)||left.index-right.index}).map(item=>item.record)}

/** Groups only through persisted foreign-key relationships; unmatched records remain visible. */
export function preserveLogPresentation(data:IncidentDetails):PreserveLogPresentation{
  const investigations=chronological(data.investigations);
  const investigationIds=new Set(investigations.map(item=>item.id));
  const approvals=chronological(data.approvals);
  const validApprovals=new Map(approvals.filter(item=>investigationIds.has(item.investigationId)).map(item=>[item.id,item]));
  const executions=chronological(data.executions);
  const validExecutions=new Map(executions.filter(item=>validApprovals.has(item.approvalId)).map(item=>[item.id,item]));
  const attempts=chronological(data.executionAttempts);
  const attemptsByExecution=new Map<string,ExecutionAttempt[]>();
  for(const attempt of attempts){if(validExecutions.has(attempt.executionId)){const current=attemptsByExecution.get(attempt.executionId)??[];current.push(attempt);attemptsByExecution.set(attempt.executionId,current)}}
  const decisionsByInvestigation=new Map<string,Approval[]>();
  for(const approval of validApprovals.values()){const current=decisionsByInvestigation.get(approval.investigationId)??[];current.push(approval);decisionsByInvestigation.set(approval.investigationId,current)}
  const executionsByApproval=new Map<string,Execution[]>();
  for(const execution of validExecutions.values()){const current=executionsByApproval.get(execution.approvalId)??[];current.push(execution);executionsByApproval.set(execution.approvalId,current)}
  return {
    groups:investigations.map(investigation=>({investigation,decisions:(decisionsByInvestigation.get(investigation.id)??[]).map(approval=>({approval,executions:executionsByApproval.get(approval.id)??[],attemptsByExecution}))})),
    ungrouped:{
      approvals:approvals.filter(item=>!investigationIds.has(item.investigationId)),
      executions:executions.filter(item=>!validApprovals.has(item.approvalId)),
      attempts:attempts.filter(item=>!validExecutions.has(item.executionId)),
    },
  };
}
export type DetailPhaseState="COMPLETED"|"IN_PROGRESS"|"UPCOMING"|"ONGOING"|"REJECTED"|"RECORDED_FAILURE"|"NO_ACTION"|"ARCHIVED";
export type DetailPhasePresentation={state:DetailPhaseState;label:string;acknowledged?:boolean};
export function detailPhasePresentation(details:IncidentDetails,phase:WorkspacePhaseId):DetailPhasePresentation{
  const status=details.incident.status,latestInvestigation=details.investigations.at(-1),latestApproval=details.approvals.at(-1),latestExecution=details.executions.at(-1);
  if(phase==="overview")return{state:"COMPLETED",label:"Recorded",acknowledged:details.auditEvents.some(event=>event.eventType==="INCIDENT_ACKNOWLEDGED")};
  if(phase==="investigation"){
    if(status==="FAILED"&&!details.executions.length)return{state:"RECORDED_FAILURE",label:"Investigation failed"};
    if(status==="NO_ACTION_REQUIRED")return{state:"NO_ACTION",label:"No action required"};
    if(status==="INVESTIGATING"||latestInvestigation?.status==="RUNNING")return{state:"IN_PROGRESS",label:"In progress"};
    if(latestInvestigation?.completedAt||latestInvestigation?.status==="COMPLETED")return{state:"COMPLETED",label:"Completed"};
    return{state:"UPCOMING",label:"Upcoming"};
  }
  if(phase==="validate"){
    if(latestApproval?.decision==="REJECTED")return{state:"REJECTED",label:"Rejected for revision"};
    if(latestApproval?.decision==="NO_ACTION_REQUIRED"||status==="NO_ACTION_REQUIRED")return{state:"NO_ACTION",label:"No action required"};
    if(latestApproval?.decision==="APPROVED")return{state:"COMPLETED",label:"Approved"};
    if(status==="AWAITING_APPROVAL"||Boolean(latestInvestigation?.proposedResolution))return{state:"IN_PROGRESS",label:"Awaiting decision"};
    return{state:"UPCOMING",label:"Upcoming"};
  }
  if(phase==="execution"){
    if(latestExecution?.status==="FAILED"||status==="FAILED")return{state:"RECORDED_FAILURE",label:"Recorded failure"};
    if(latestExecution?.status==="SUCCEEDED")return{state:"COMPLETED",label:"Recorded outcome"};
    if(status==="APPROVED"||status==="EXECUTING"||latestExecution)return{state:"IN_PROGRESS",label:"Tracking"};
    return{state:"UPCOMING",label:"Upcoming"};
  }
  if(phase==="activity-log")return status==="CLOSED"?{state:"ARCHIVED",label:"Archived"}:{state:"ONGOING",label:"Ongoing"};
  if(status==="CLOSED")return{state:"COMPLETED",label:"Closed"};
  if(status==="NO_ACTION_REQUIRED")return{state:"NO_ACTION",label:"No action required"};
  if(status==="RESOLVED")return{state:"IN_PROGRESS",label:"Ready to close"};
  return{state:"UPCOMING",label:"Upcoming"};
}
export function workspacePhaseFor(details:IncidentDetails):WorkspacePhaseId{const status=details.incident.status;if(status==="OPEN")return"overview";if(status==="INVESTIGATING"||status==="REJECTED"||(status==="FAILED"&&!details.executions.length))return"investigation";if(status==="AWAITING_APPROVAL")return"validate";if(status==="APPROVED"||status==="EXECUTING"||(status==="FAILED"&&details.executions.length))return"execution";if(status==="RESOLVED"||status==="NO_ACTION_REQUIRED"||status==="CLOSED")return"postmortem";return"overview"}
export function workflowActionPhaseFor(details:IncidentDetails):WorkspacePhaseId{const status=details.incident.status;if(status==="OPEN"||status==="INVESTIGATING"||status==="REJECTED"||(status==="FAILED"&&!details.executions.length))return"investigation";if(status==="AWAITING_APPROVAL")return"validate";if(status==="APPROVED"||status==="EXECUTING"||(status==="FAILED"&&details.executions.length))return"execution";return"postmortem"}
