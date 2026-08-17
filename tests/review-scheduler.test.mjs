import test from "node:test";
import assert from "node:assert/strict";
import { calculateNextReview } from "../src/features/review/services/review-scheduler.ts";

test("ReviewScheduler - again rating", () => {
  const currentState = {
    state: "new",
    intervalDays: 5,
    ease: 2.5,
    correctStreak: 3,
    lapseCount: 1,
  };

  const result = calculateNextReview(currentState, "again", new Date("2026-08-17T12:00:00Z"));

  assert.equal(result.state, "learning");
  assert.equal(result.intervalDays, 0);
  assert.equal(result.correctStreak, 0);
  assert.equal(result.lapseCount, 2);
  assert.equal(result.ease, 2.3);
  assert.ok(result.dueAt);
});

test("ReviewScheduler - hard rating", () => {
  const currentState = {
    state: "learning",
    intervalDays: 1,
    ease: 2.5,
    correctStreak: 0,
    lapseCount: 0,
  };

  const result = calculateNextReview(currentState, "hard", new Date("2026-08-17T12:00:00Z"));

  assert.equal(result.state, "review");
  assert.equal(result.intervalDays, 1); // 1 * 1.2 = 1.2 -> rounded to 1
  assert.equal(result.correctStreak, 1);
  assert.equal(result.ease, 2.35); // 2.5 - 0.15
  assert.ok(result.dueAt);
});

test("ReviewScheduler - good rating first streak", () => {
  const currentState = {
    state: "new",
    intervalDays: 0,
    ease: 2.5,
    correctStreak: 0,
    lapseCount: 0,
  };

  const result = calculateNextReview(currentState, "good", new Date("2026-08-17T12:00:00Z"));

  assert.equal(result.state, "review");
  assert.equal(result.intervalDays, 1);
  assert.equal(result.correctStreak, 1);
  assert.equal(result.ease, 2.5);
  assert.ok(result.dueAt);
});

test("ReviewScheduler - good rating higher streak", () => {
  const currentState = {
    state: "review",
    intervalDays: 4,
    ease: 2.5,
    correctStreak: 2,
    lapseCount: 0,
  };

  const result = calculateNextReview(currentState, "good", new Date("2026-08-17T12:00:00Z"));

  assert.equal(result.state, "review");
  assert.equal(result.intervalDays, 10); // 4 * 2.5 = 10
  assert.equal(result.correctStreak, 3);
  assert.equal(result.ease, 2.5);
  assert.ok(result.dueAt);
});

test("ReviewScheduler - easy rating first streak", () => {
  const currentState = {
    state: "new",
    intervalDays: 0,
    ease: 2.5,
    correctStreak: 0,
    lapseCount: 0,
  };

  const result = calculateNextReview(currentState, "easy", new Date("2026-08-17T12:00:00Z"));

  assert.equal(result.state, "review");
  assert.equal(result.intervalDays, 4);
  assert.equal(result.correctStreak, 1);
  assert.equal(result.ease, 2.65);
  assert.ok(result.dueAt);
});

test("ReviewScheduler - easy rating transitions to mastered", () => {
  const currentState = {
    state: "review",
    intervalDays: 6,
    ease: 2.65,
    correctStreak: 3,
    lapseCount: 0,
  };

  const result = calculateNextReview(currentState, "easy", new Date("2026-08-17T12:00:00Z"));

  // correctStreak becomes 4, which triggers "mastered"
  assert.equal(result.state, "mastered");
  assert.equal(result.intervalDays, 22); // Math.round(6 * 2.8 * 1.3) = 22
  assert.equal(result.correctStreak, 4);
  assert.equal(result.ease, 2.8);
  assert.ok(result.dueAt);
});
