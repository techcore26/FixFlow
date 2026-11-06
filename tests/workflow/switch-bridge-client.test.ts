import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createSwitchBridgeTransport } from "../../src/server/switch/bridge-client";

const config = {
  enabled: true as const,
  bridgeUrl: "http://127.0.0.1:8000",
  agentId: "test-agent",
  agentApiKey: "test-key",
  roomId: "test-room",
  targetAgentId: "test-responder",
};

test("long polling allows more time than the requested wait", async () => {
  let observedUrl = "";

  const fakeFetch: typeof fetch = async (input, init) => {
    observedUrl = String(input);
    const signal = init?.signal;
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal.aborted, false);
    return new Response(null, { status: 204 });
  };

  const transport = createSwitchBridgeTransport(config, fakeFetch);
  const events = await transport.pollRoomEvents(10);

  assert.deepEqual(events, []);
  assert.match(observedUrl, /timeout=10$/);
  assert.equal(observedUrl.endsWith("timeout=10"), true);
});

test("message dispatch retains its normal timeout and acknowledgement", async () => {
  let observedUrl = "";
  let observedBody: unknown;

  const fakeFetch: typeof fetch = async (input, init) => {
    observedUrl = String(input);
    observedBody = JSON.parse(String(init?.body));
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(init.signal.aborted, false);
    return Response.json({ event_id: "event-test" });
  };

  const transport = createSwitchBridgeTransport(config, fakeFetch);
  const result = await transport.sendMessage("Test request");

  assert.deepEqual(result, { eventId: "event-test" });
  assert.match(observedUrl, /\/agents\/test-agent\/message$/);
  assert.deepEqual(observedBody, {
    room_id: "test-room",
    content: "Test request",
  });
});

test("HTTP timeout budgets are 15s for polling and 8s for sending", async () => {
  const durations: number[] = [];
  const originalTimeout = AbortSignal.timeout;

  const timeoutMock = mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    durations.push(milliseconds);
    return originalTimeout(milliseconds);
  });

  try {
    const fakeFetch: typeof fetch = async (input) =>
      String(input).includes("/events?")
        ? new Response(null, { status: 204 })
        : Response.json({ event_id: "test-event" });

    const transport = createSwitchBridgeTransport(config, fakeFetch);

    await transport.pollRoomEvents(10);
    await transport.sendMessage("Test");

    assert.deepEqual(durations, [15_000, 8_000]);
  } finally {
    timeoutMock.mock.restore();
  }
});
