import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appNavigationLinks } from "../../src/components/layout/app-sidebar";
import { dashboardDataState } from "../../src/components/dashboard/dashboard-view";

test("mobile navigation retains every application destination, including Demo Tour", () => {
  assert.deepEqual(appNavigationLinks.map(link => link.href), ["/dashboard", "/incidents", "/impact", "/architecture", "/demo"]);
  assert.equal(appNavigationLinks.length, 5);
});

test("dashboard data states distinguish loading, errors, empty records, and loaded records", () => {
  assert.equal(dashboardDataState(true, false, 0), "loading");
  assert.equal(dashboardDataState(false, true, 0), "error");
  assert.equal(dashboardDataState(false, false, 0), "empty");
  assert.equal(dashboardDataState(false, false, 1), "loaded");
});

test("command palette source keeps its focus lifecycle inside the modal", () => {
  const source = readFileSync(new URL("../../src/components/navigation/command-palette.tsx", import.meta.url), "utf8");
  assert.match(source, /searchRef\.current\?\.focus\(\)/);
  assert.match(source, /document\.addEventListener\("keydown", trap, true\)/);
  assert.match(source, /trigger\?\.isConnected\) trigger\.focus\(\)/);
});
