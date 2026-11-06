import assert from "node:assert/strict";
import test from "node:test";
import { IMPACT_INCIDENTS_PER_MONTH, IMPACT_PROJECTION_DISCLOSURE, illustrativeCoordinationHours, impactRecordState } from "../../src/components/impact/impact-view";

test("impact calculator preserves the four-incidents-per-month formula and rounding", () => {
  assert.equal(IMPACT_INCIDENTS_PER_MONTH, 4);
  assert.equal(illustrativeCoordinationHours(8, 2.5), 80);
  assert.equal(illustrativeCoordinationHours(2, 0.5), 4);
  assert.equal(illustrativeCoordinationHours(30, 12), 1440);
  assert.equal(illustrativeCoordinationHours(7, 1.3), 36);
  assert.match(IMPACT_PROJECTION_DISCLOSURE, /four incidents monthly/i);
  assert.match(IMPACT_PROJECTION_DISCLOSURE, /not measured savings or a financial projection/i);
});

test("impact record states never present loading or failed fetches as zero records", () => {
  assert.equal(impactRecordState("loading", 0), "loading");
  assert.equal(impactRecordState("error", 0), "error");
  assert.equal(impactRecordState("ready", 0), "empty");
  assert.equal(impactRecordState("ready", 1), "loaded");
});
