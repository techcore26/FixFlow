import type { Metadata } from "next"; import { AppShell } from "@/components/layout/app-shell"; import { ImpactView } from "@/components/impact/impact-view";
export const metadata:Metadata={title:"Impact"}; export default function ImpactPage(){return <AppShell title="Impact, without the hand-waving." kicker="Real records · Illustrative outcomes"><ImpactView/></AppShell>}
