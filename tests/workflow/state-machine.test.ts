import assert from "node:assert/strict";
import { test } from "node:test";
import { incidentStatuses, type IncidentStatus } from "../../src/db/types";
import { canTransition, incidentTransitions } from "../../src/server/incidents/state-machine";

test("state machine exposes every incident status and only declared transitions", () => {
  assert.deepEqual(Object.keys(incidentTransitions).sort(), [...incidentStatuses].sort());
  assert.equal(canTransition("OPEN", "INVESTIGATING"), true);
  assert.equal(canTransition("OPEN", "CLOSED"), false);
  assert.equal(canTransition("FAILED", "INVESTIGATING"), true);
  assert.equal(canTransition("FAILED", "EXECUTING"), true);
  assert.equal(canTransition("CLOSED", "OPEN"), false);

  for (const from of incidentStatuses) {
    for (const to of incidentStatuses) {
      const declared = (incidentTransitions[from] as readonly IncidentStatus[]).includes(to);
      assert.equal(canTransition(from, to), declared);
    }
  }
});
