// backend/tests/leaderboardScore.test.js
import assert from "node:assert/strict";
import {
  calculateLeaderboardScore,
  LEADERBOARD_CONFIG,
} from "../services/leaderboardScoreService.js";

console.log("🚀 Starting Leaderboard Score Test Suite...\n");

// 1. Verification of Section 7 example
{
  const res = calculateLeaderboardScore(85, 10, 15, 20);
  console.log("Test 1 - Section 7 Example (AFS=85, TS=10, VW=15, K=20):", res);
  assert.equal(res.score, 64.17);
  assert.equal(res.scoreString, "64.17");
  assert.equal(res.focusComponent, 56.67);
  assert.equal(res.videoBonus, 7.5);
  console.log("✅ Passed Test 1: Exactly 64.17\n");
}

// 2. Tab switches tests: 0, 5, 10, 20, 50, 100 (AFS=80, VW=10, K=20)
{
  const tsCases = [0, 5, 10, 20, 50, 100];
  console.log("Test 2 - Tab Switches Variation [0, 5, 10, 20, 50, 100]:");
  tsCases.forEach((ts) => {
    const res = calculateLeaderboardScore(80, ts, 10, 20);
    const expectedBonus = 10 * Math.min(10 / 20, 1); // 5.0
    const expectedFocus = 80 * (1 - ts / (ts + 20));
    const expectedScore = Number((expectedFocus + expectedBonus).toFixed(2));
    assert.equal(res.score, expectedScore);
    console.log(`   TS = ${ts} -> Focus: ${res.focusComponent}, Bonus: ${res.videoBonus}, Final Score: ${res.score}`);
  });
  console.log("✅ Passed Test 2\n");
}

// 3. Videos watched tests: 0, 5, 10, 15, 20, 25+ (AFS=80, TS=0, K=20)
{
  const vwCases = [0, 5, 10, 15, 20, 25, 50];
  console.log("Test 3 - Videos Watched Variation [0, 5, 10, 15, 20, 25, 50]:");
  vwCases.forEach((vw) => {
    const res = calculateLeaderboardScore(80, 0, vw, 20);
    const expectedBonus = Number((10 * Math.min(vw / 20, 1)).toFixed(2));
    assert.equal(res.focusComponent, 80); // TS=0 => full focus
    assert.equal(res.videoBonus, expectedBonus);
    assert.equal(res.score, Number((80 + expectedBonus).toFixed(2)));
    console.log(`   VW = ${vw} -> Bonus: ${res.videoBonus} (Capped at 10: ${res.videoBonus <= 10}), Final: ${res.score}`);
  });
  console.log("✅ Passed Test 3: Capped at 10 bonus points\n");
}

// 4. Edge Cases: No activity day (TS=0, VW=0)
{
  console.log("Test 4 - No activity day:");
  const res = calculateLeaderboardScore(90, 0, 0, 20);
  assert.equal(res.focusComponent, 90);
  assert.equal(res.videoBonus, 0);
  assert.equal(res.score, 90);
  console.log("✅ Passed Test 4: Score equals AFS (90)\n");
}

// 5. Edge Cases: Missing / invalid / null / undefined / negative / NaN values
{
  console.log("Test 5 - Missing and invalid values:");
  const resNull = calculateLeaderboardScore(null, null, null);
  assert.equal(resNull.score, 0);
  assert.equal(isNaN(resNull.score), false);

  const resUndefined = calculateLeaderboardScore(undefined, undefined, undefined);
  assert.equal(resUndefined.score, 0);

  const resNeg = calculateLeaderboardScore(80, -5, -10);
  assert.equal(resNeg.tsDay, 0);
  assert.equal(resNeg.vwDay, 0);
  assert.equal(resNeg.score, 80);

  const resNan = calculateLeaderboardScore("invalid", "nan", "xyz");
  assert.equal(resNan.score, 0);
  console.log("✅ Passed Test 5: Safe handling of invalid inputs (no NaN or Infinity)\n");
}

// 6. Date Isolation: Same user across different dates (Section 4 Example)
{
  console.log("Test 6 - Date Isolation (21 Oct vs 22 Oct):");
  // User historical AFS = 85
  const AFS_all_time = 85;

  // 21 October: TS_day = 10, VW_day = 15
  const oct21 = calculateLeaderboardScore(AFS_all_time, 10, 15, 20);

  // 22 October: TS_day = 3, VW_day = 8
  const oct22 = calculateLeaderboardScore(AFS_all_time, 3, 8, 20);

  console.log("   21 October Score:", oct21.score, "(Focus:", oct21.focusComponent, "Bonus:", oct21.videoBonus, ")");
  console.log("   22 October Score:", oct22.score, "(Focus:", oct22.focusComponent, "Bonus:", oct22.videoBonus, ")");

  assert.equal(oct21.score, 64.17);
  // Oct 22: Focus = 85 * (1 - 3/23) = 85 * (20/23) = 73.913, Bonus = 10 * (8/20) = 4.0 -> 77.91
  assert.equal(oct22.score, 77.91);

  // Verify that combined/cumulative TS=13 or VW=23 is NOT used
  const octCombinedWrong = calculateLeaderboardScore(AFS_all_time, 13, 23, 20);
  assert.notEqual(oct22.score, octCombinedWrong.score);
  console.log("✅ Passed Test 6: Strict Date Isolation verified!\n");
}

// 7. Multiple users comparison
{
  console.log("Test 7 - Multiple Users comparison on a given day:");
  const userA = { name: "Alice", afs: 92, ts: 2, vw: 12 };
  const userB = { name: "Bob", afs: 80, ts: 0, vw: 20 };
  const userC = { name: "Charlie", afs: 95, ts: 30, vw: 5 };

  const scoreA = calculateLeaderboardScore(userA.afs, userA.ts, userA.vw, 20);
  const scoreB = calculateLeaderboardScore(userB.afs, userB.ts, userB.vw, 20);
  const scoreC = calculateLeaderboardScore(userC.afs, userC.ts, userC.vw, 20);

  console.log(`   ${userA.name}: Score=${scoreA.score} (AFS=${userA.afs}, TS=${userA.ts}, VW=${userA.vw})`);
  console.log(`   ${userB.name}: Score=${scoreB.score} (AFS=${userB.afs}, TS=${userB.ts}, VW=${userB.vw})`);
  console.log(`   ${userC.name}: Score=${scoreC.score} (AFS=${userC.afs}, TS=${userC.ts}, VW=${userC.vw})`);

  assert.ok(scoreA.score > 0 && scoreB.score > 0 && scoreC.score > 0);
  console.log("✅ Passed Test 7: Multiple users scored deterministically\n");
}

// 8. Clamping strictly between 0 and 100 (Never > 100, never < 0)
{
  console.log("Test 8 - Clamping strictly between 0 and 100:");
  // Case A: Score attempts to exceed 100 (AFS=98, TS=0, VW=20 => 98 + 10 = 108 => clamped to 100.00)
  const resOverflow = calculateLeaderboardScore(98, 0, 20, 20);
  console.log("   Overflow attempt (98 focus + 10 bonus = 108):", resOverflow.score);
  assert.equal(resOverflow.score, 100.0);
  assert.equal(resOverflow.scoreString, "100.00");

  // Case B: AFS = 100, TS = 0, VW = 25 => 100 + 10 = 110 => clamped to 100.00
  const resMax = calculateLeaderboardScore(100, 0, 25, 20);
  assert.equal(resMax.score, 100.0);

  // Case C: Negative inputs / underflow attempt
  const resUnderflow = calculateLeaderboardScore(-50, 100, -5, 20);
  console.log("   Underflow attempt:", resUnderflow.score);
  assert.equal(resUnderflow.score, 0.0);
  assert.equal(resUnderflow.score >= 0, true);
  assert.equal(resUnderflow.score <= 100, true);
  console.log("✅ Passed Test 8: Clamping strictly 0 - 100 verified!\n");
}

// 9. Zero monitoring records / new user (AFS = 0)
{
  console.log("Test 9 - User with NO monitoring records (AFS = 0):");
  // User with no monitoring records who did not study (like new user or Patna Friend)
  const resNoActivity = calculateLeaderboardScore(0, 0, 0, 20);
  console.log("   No records, no activity:", resNoActivity.score);
  assert.equal(resNoActivity.score, 0.0);
  assert.equal(resNoActivity.scoreString, "0.00");

  // User with no monitoring records who watched 5 videos
  const resOnlyVideos = calculateLeaderboardScore(0, 0, 5, 20);
  console.log("   No monitoring, 5 videos watched:", resOnlyVideos.score);
  assert.equal(resOnlyVideos.focusComponent, 0.0);
  assert.equal(resOnlyVideos.videoBonus, 2.5);
  assert.equal(resOnlyVideos.score, 2.5);
  console.log("✅ Passed Test 9: Zero monitoring records gives AFS=0, no false 100% ranks!\n");
}

console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 100% Deterministic, Clamped, and Verified.");
