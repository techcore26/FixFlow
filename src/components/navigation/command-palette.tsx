"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const commands = [
  { label: "Open dashboard", href: "/dashboard", hint: "Overview and trends" },
  { label: "Browse incidents", href: "/incidents", hint: "Create and manage" },
  { label: "View architecture", href: "/architecture", hint: "How FixFlow works" },
  { label: "Open impact", href: "/impact", hint: "Illustrative outcomes" },
  { label: "Start demo tour", href: "/demo", hint: "Judge walkthrough" },
  { label: "Return home", href: "/", hint: "Marketing page" },
];

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const filtered = useMemo(() => commands.filter(command => (command.label + command.hint).toLowerCase().includes(query.toLowerCase())), [query]);

  function close() { setOpen(false); }

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(current => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const openPalette = () => setOpen(true);
    window.addEventListener("keydown", key);
    window.addEventListener("fixflow-command", openPalette);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("fixflow-command", openPalette);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focus = window.setTimeout(() => searchRef.current?.focus(), 0);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap, true);
    return () => {
      window.clearTimeout(focus);
      document.removeEventListener("keydown", trap, true);
      const trigger = returnFocusRef.current;
      if (trigger?.isConnected) trigger.focus();
      returnFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-start bg-[rgba(27,24,48,.3)] px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={close}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick navigation" className="glass mx-auto w-full max-w-xl overflow-hidden rounded-[28px]" onMouseDown={event => event.stopPropagation()}>
      <label className="flex items-center gap-3 border-b border-[var(--line)] px-5"><span aria-hidden>⌘</span><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Where would you like to go?" className="h-16 w-full bg-transparent outline-none" /></label>
      <div className="p-2">{filtered.map(command => <button key={command.href} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left hover:bg-violet-50" onClick={() => { close(); router.push(command.href); }}><span className="font-semibold">{command.label}</span><span className="text-xs text-[var(--muted)]">{command.hint}</span></button>)}</div>
    </div>
  </div>;
}
