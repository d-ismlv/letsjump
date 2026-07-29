import assert from "node:assert/strict";
import test from "node:test";
import {
  gustSpeedStatus,
  gustSpreadStatus,
  rateHour,
} from "../lib/decision.ts";

const safeWeather = {
  windMs: 4,
  gustMs: 8,
  precipMmH: 0,
  precipProb: 0,
  weatherCode: 0,
  cape: 0,
  cloudLow: 0,
  cloudMid: 0,
  cloudHigh: 0,
  cloudTotal: 0,
  dataComplete: true,
};

test("peak gust above 11.5 m/s is NO-GO even with a different wind source", () => {
  const result = rateHour({
    ...safeWeather,
    windMs: 7,
    gustMs: 12,
    gustSpreadComparable: false,
  });

  assert.equal(result.status, "nogo");
  assert.equal(result.limiter, "gust");
});

test("peak-gust boundary becomes cautious before it becomes NO-GO", () => {
  assert.equal(gustSpeedStatus(9.9), "go");
  assert.equal(gustSpeedStatus(10), "consider");
  assert.equal(gustSpeedStatus(11.5), "consider");
  assert.equal(gustSpeedStatus(11.6), "nogo");
  assert.equal(gustSpeedStatus(12), "nogo");
});

test("a 3 to 9 m/s change is NO-GO", () => {
  const result = rateHour({
    ...safeWeather,
    windMs: 3,
    gustMs: 9,
  });

  assert.equal(result.status, "nogo");
  assert.equal(result.limiter, "gust");
});

test("a 5 to 10.5 m/s change is NO-GO", () => {
  const result = rateHour({
    ...safeWeather,
    windMs: 5,
    gustMs: 10.5,
  });

  assert.equal(result.status, "nogo");
  assert.equal(result.limiter, "gust");
});

test("gust-spread boundary is conservative", () => {
  assert.equal(gustSpreadStatus(4.9), "go");
  assert.equal(gustSpreadStatus(5), "consider");
  assert.equal(gustSpreadStatus(5.49), "consider");
  assert.equal(gustSpreadStatus(5.5), "nogo");
  assert.equal(gustSpreadStatus(6), "nogo");
});
