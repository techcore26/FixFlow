import assert from "node:assert/strict";
import { test } from "node:test";
import { SwitchTransportError } from "../../src/server/switch/bridge-client";
import { runSwitchWorker } from "../../src/server/switch/worker";

test("recovers after transient transport failures with bounded backoff", async () => {
  const controller = new AbortController();
  const delays: number[] = [];
  let polls = 0;

  const worker = {
    async expire() { return 0; },
    async dispatchOne() { return false; },
    async pollOnce() {
      polls += 1;
      if (polls <= 7) {
        throw new SwitchTransportError("NETWORK", false, "Temporary failure");
      }
      controller.abort();
    },
  };

  await runSwitchWorker(worker, controller.signal, async (ms) => {
    delays.push(ms);
  });

  assert.equal(polls, 8);
  assert.deepEqual(delays, [
    1000, 2000, 4000, 8000, 16000, 30000, 30000,
  ]);
});

test("authentication failures stop the worker without retrying", async () => {
  const controller = new AbortController();
  let retries = 0;

  const worker = {
    async expire() { return 0; },
    async dispatchOne() { return false; },
    async pollOnce(): Promise<void> {
      throw new SwitchTransportError("AUTH", false, "Unauthorized");
    },
  };

  await assert.rejects(
    runSwitchWorker(worker, controller.signal, async () => {
      retries += 1;
    }),
    (error: unknown) =>
      error instanceof SwitchTransportError && error.code === "AUTH",
  );

  assert.equal(retries, 0);
});

test("shutdown interrupts an outstanding retry delay", async () => {
  const controller = new AbortController();
  let enteredDelay = false;

  const worker = {
    async expire() { return 0; },
    async dispatchOne() { return false; },
    async pollOnce(): Promise<void> {
      throw new SwitchTransportError("NETWORK", false, "Temporary failure");
    },
  };

  await runSwitchWorker(worker, controller.signal, async () => {
    enteredDelay = true;
    controller.abort();
  });

  assert.equal(enteredDelay, true);
});
