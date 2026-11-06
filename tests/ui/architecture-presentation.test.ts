import assert from "node:assert/strict";
import test from "node:test";
import { plannedSwitchBoundary, verifiedArchitectureLayers } from "../../src/components/architecture/architecture-flow";

test("architecture separates verified local layers from the planned Switch boundary", () => {
  assert.deepEqual(verifiedArchitectureLayers.map(layer => layer.title), ["Operator experience", "Validated API", "Guarded workflow", "SQLite audit record"]);
  assert.equal(verifiedArchitectureLayers.some(layer => /switch/i.test(layer.title)), false);
  assert.equal(plannedSwitchBoundary.status, "Planned · unverified");
  assert.match(plannedSwitchBoundary.copy, /not implemented/i);
  assert.match(plannedSwitchBoundary.copy, /server-side/i);
});
