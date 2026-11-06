import assert from "node:assert/strict";
import test from "node:test";
import { autoplayAvailable, nextTourIndex, TOUR_INTERVAL_MS, tourReadOnlyStatement, tourSteps } from "../../src/components/demo/judge-tour";

test("Demo Tour keeps its five read-only workflow steps in order", () => {
  assert.deepEqual(tourSteps.map(step => step.k), ["01", "02", "03", "04", "05"]);
  assert.match(tourSteps[1].copy, /Switch remains visibly disconnected/i);
  assert.match(tourSteps[3].copy, /no command or patch/i);
  assert.match(tourReadOnlyStatement, /never creates, updates, approves, executes, or closes incident data/i);
});

test("Demo Tour progression stops at the final step and honors reduced motion", () => {
  assert.equal(TOUR_INTERVAL_MS, 3200);
  assert.equal(nextTourIndex(0), 1);
  assert.equal(nextTourIndex(4), 4);
  assert.equal(autoplayAvailable(false), true);
  assert.equal(autoplayAvailable(true), false);
});
