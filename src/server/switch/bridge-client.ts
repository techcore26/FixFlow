import type { SwitchConfig } from "@/config/switch";

export class SwitchTransportError extends Error {
  constructor(readonly code: "AUTH" | "HTTP" | "TIMEOUT" | "NETWORK", readonly deliveryUncertain: boolean, message: string) { super(message); }
}

export type BridgeEvent = { type?: unknown; room_id?: unknown; payload?: unknown };
export interface SwitchBridgeTransport { sendMessage(content: string): Promise<{ eventId: string }>; pollRoomEvents(timeoutSeconds: number): Promise<BridgeEvent[]>; }

export function createSwitchBridgeTransport(config: Extract<SwitchConfig, { enabled: true }>, fetchImpl: typeof fetch = fetch): SwitchBridgeTransport {
  const headers = { Authorization: `Bearer ${config.agentApiKey}`, "Content-Type": "application/json" };
  async function request(path: string, init: RequestInit, uncertain: boolean, timeoutMs = 8_000) {
    try {
      const response = await fetchImpl(`${config.bridgeUrl}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new SwitchTransportError(response.status === 401 || response.status === 403 ? "AUTH" : "HTTP", false, `Switch request was refused (${response.status}).`);
      return response;
    } catch (error) {
      if (error instanceof SwitchTransportError) throw error;
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new SwitchTransportError(timedOut ? "TIMEOUT" : "NETWORK", uncertain, timedOut ? "Switch request timed out." : "Switch bridge is unavailable.");
    }
  }
  return {
    async sendMessage(content) {
      const response = await request(`/agents/${encodeURIComponent(config.agentId)}/message`, { method: "POST", body: JSON.stringify({ room_id: config.roomId, content }) }, true);
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || typeof (data as { event_id?: unknown }).event_id !== "string") throw new SwitchTransportError("HTTP", true, "Switch accepted an invalid message acknowledgement.");
      return { eventId: (data as { event_id: string }).event_id };
    },
    async pollRoomEvents(timeoutSeconds) {
      const pollSeconds = Math.min(10, Math.max(1, timeoutSeconds));
      const response = await request(
        `/agents/${encodeURIComponent(config.agentId)}/rooms/${encodeURIComponent(config.roomId)}/events?timeout=${pollSeconds}`,
        { method: "GET" },
        false,
        pollSeconds * 1000 + 5_000,
      );
      if (response.status === 204) return [];
      const data: unknown = await response.json();
      return data && typeof data === "object" && Array.isArray((data as { events?: unknown }).events) ? (data as { events: BridgeEvent[] }).events : [];
    },
  };
}
