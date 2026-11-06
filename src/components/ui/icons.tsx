import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function DashboardIcon(props:IconProps){return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>}
export function IncidentIcon(props:IconProps){return <svg {...base} {...props}><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4"/><path d="M12 16.5h.01"/></svg>}
export function ImpactIcon(props:IconProps){return <svg {...base} {...props}><path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/></svg>}
export function ArchitectureIcon(props:IconProps){return <svg {...base} {...props}><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/></svg>}
export function PlayIcon(props:IconProps){return <svg {...base} {...props}><path d="m8 5 11 7-11 7V5Z"/></svg>}
export function SearchIcon(props:IconProps){return <svg {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>}
export function SignalIcon(props:IconProps){return <svg {...base} {...props}><path d="M4 17v2M8 13v6M12 9v10M16 5v14M20 11v8"/></svg>}
export function InvestigateIcon(props:IconProps){return <svg {...base} {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/><path d="M8 10.5h5M10.5 8v5"/></svg>}
export function ApprovalIcon(props:IconProps){return <svg {...base} {...props}><path d="M8 3h8l3 3v15H5V3h3Z"/><path d="M9 12.5 11 15l4.5-5"/></svg>}
export function AuditIcon(props:IconProps){return <svg {...base} {...props}><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/><path d="M16 3h5v5"/></svg>}
export function ArrowIcon(props:IconProps){return <svg {...base} {...props}><path d="M5 12h14M14 7l5 5-5 5"/></svg>}
export function ShieldIcon(props:IconProps){return <svg {...base} {...props}><path d="M12 3 5 6v5c0 4.8 2.8 8.3 7 10 4.2-1.7 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>}
export function FilterIcon(props:IconProps){return <svg {...base} {...props}><path d="M4 6h16M7 12h10M10 18h4"/></svg>}
export function DownloadIcon(props:IconProps){return <svg {...base} {...props}><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>}
export function ClockIcon(props:IconProps){return <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
export function CloseIcon(props:IconProps){return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>}
