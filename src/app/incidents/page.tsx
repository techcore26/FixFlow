import type { Metadata } from "next"; import { AppShell } from "@/components/layout/app-shell"; import { IncidentsView } from "@/components/incidents/incidents-view";
export const metadata:Metadata={title:"Incidents"}; export default function IncidentsPage(){return <AppShell title="Incidents" kicker="One accountable record"><IncidentsView/></AppShell>}
