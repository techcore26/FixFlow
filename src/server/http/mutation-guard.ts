import { ForbiddenMutationError } from "@/server/incidents/errors";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertLocalMutationRequest(request: Request): void {
  const host = request.headers.get("host");
  if (!host) throw new ForbiddenMutationError("A Host header is required.");

  let requestHost: string;
  try {
    requestHost = new URL(`${new URL(request.url).protocol}//${host}`).hostname;
  } catch {
    throw new ForbiddenMutationError("The Host header is invalid.");
  }
  if (!localHosts.has(requestHost)) {
    throw new ForbiddenMutationError("Mutation endpoints are restricted to the local machine.");
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  if (originUrl.host !== host || originUrl.protocol !== requestUrl.protocol) {
    throw new ForbiddenMutationError("Cross-origin mutation requests are not allowed.");
  }
}
