"use client";
import type { ReactNode } from "react"; import { CommandPalette } from "../navigation/command-palette";
export function AppProvider({children}:{children:ReactNode}){return <>{children}<CommandPalette/></>}
