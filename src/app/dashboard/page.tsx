import type { Metadata } from "next"; import { AppShell } from "@/components/layout/app-shell"; import { DashboardView } from "@/components/dashboard/dashboard-view";
export const metadata:Metadata={title:"Dashboard"};
export default function DashboardPage(){return <AppShell title="Good morning, operator." kicker="Operational overview"><DashboardView/></AppShell>}
