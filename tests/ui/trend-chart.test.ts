import assert from "node:assert/strict"; import test from "node:test"; import { getYAxisTicks } from "../../src/components/dashboard/trend-chart";

function assertOrderedUnique(values:number[]){assert.deepEqual(values,[...new Set(values)]);assert.deepEqual(values,[...values].sort((a,b)=>a-b))}

test("Y-axis ticks handle zero and single-incident maxima without duplicates",()=>{assert.deepEqual(getYAxisTicks(0),[0,1]);assert.deepEqual(getYAxisTicks(1),[0,1]);assertOrderedUnique(getYAxisTicks(0));assertOrderedUnique(getYAxisTicks(1))});
test("Y-axis ticks preserve zero, midpoint, and maximum for two incidents",()=>{assert.deepEqual(getYAxisTicks(2),[0,1,2]);assertOrderedUnique(getYAxisTicks(2))});
test("Y-axis ticks remain ordered and unique for sparse and larger maxima",()=>{for(const maximum of[3,8,25]){const ticks=getYAxisTicks(maximum);assert.equal(ticks[0],0);assert.equal(ticks.at(-1),maximum);assertOrderedUnique(ticks)}});
test("chart point key strategy remains unique when dates repeat",()=>{const dates=["2026-11-04","2026-11-04","2026-11-05"];const keys=dates.map((date,index)=>`point-${date}-${index}`);assert.equal(new Set(keys).size,keys.length)});
