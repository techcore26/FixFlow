import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { IncidentWorkspaceView } from "@/components/incidents/incident-workspace-view";
export const metadata:Metadata={title:"Technical incident workspace"};
export default async function WorkspacePage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AppShell title="Technical workspace" kicker="Investigate · Approve · Track"><IncidentWorkspaceView id={id}/></AppShell>}
