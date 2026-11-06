import type { Metadata } from "next"; import { AppShell } from "@/components/layout/app-shell"; import { JudgeTour } from "@/components/demo/judge-tour";
export const metadata:Metadata={title:"Demo tour"}; export default function DemoPage(){return <AppShell title="Demo tour" kicker="A guided, non-mutating walkthrough"><JudgeTour/></AppShell>}
