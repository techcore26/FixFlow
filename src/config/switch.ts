import { z } from "zod";

const bridgeUrl = z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Switch bridge URL must use HTTP(S).");
const required = z.string().trim().min(1).max(512);

export type SwitchConfig = { enabled: false } | { enabled: true; bridgeUrl: string; agentId: string; agentApiKey: string; roomId: string; targetAgentId: string };

export function getSwitchConfig(environment: Record<string, string | undefined> = process.env): SwitchConfig {
  if (environment.SWITCH_ENABLED !== "true") return { enabled: false };
  const parsed = z.object({ SWITCH_AGENT_BRIDGE_URL: bridgeUrl, SWITCH_AGENT_ID: required, SWITCH_AGENT_API_KEY: required, SWITCH_ROOM_ID: required, SWITCH_TARGET_AGENT_ID: required }).safeParse(environment);
  if (!parsed.success) return { enabled: false };
  const value = parsed.data;
  return { enabled: true, bridgeUrl: value.SWITCH_AGENT_BRIDGE_URL.replace(/\/$/, ""), agentId: value.SWITCH_AGENT_ID, agentApiKey: value.SWITCH_AGENT_API_KEY, roomId: value.SWITCH_ROOM_ID, targetAgentId: value.SWITCH_TARGET_AGENT_ID };
}
