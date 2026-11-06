import assert from "node:assert/strict";
import { test } from "node:test";
import { assertLocalMutationRequest } from "../../src/server/http/mutation-guard";
import { ForbiddenMutationError } from "../../src/server/incidents/errors";

test("allows local same-origin and non-browser mutation requests", () => {
  assert.doesNotThrow(() =>
    assertLocalMutationRequest(
      new Request("http://localhost:3000/api/incidents", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    assertLocalMutationRequest(
      new Request("http://127.0.0.1:3000/api/incidents", {
        method: "POST",
        headers: { host: "127.0.0.1:3000" },
      }),
    ),
  );
});

test("rejects cross-origin and non-local mutation requests", () => {
  assert.throws(
    () =>
      assertLocalMutationRequest(
        new Request("http://localhost:3000/api/incidents", {
          method: "POST",
          headers: { host: "localhost:3000", origin: "https://evil.example" },
        }),
      ),
    ForbiddenMutationError,
  );
  assert.throws(
    () =>
      assertLocalMutationRequest(
        new Request("https://fixflow.example/api/incidents", {
          method: "POST",
          headers: { host: "fixflow.example" },
        }),
      ),
    ForbiddenMutationError,
  );
});
