// backend/services/leaderboardScoreService.js

/**
 * Configurable leaderboard scoring constants
 * Kept in one central place so K can be tuned without modifying formula across files.
 */
export const LEADERBOARD_CONFIG = {
  K: 20, // Tab-switch penalty constant
  DAILY_VIDEO_TARGET: 20, // Target videos watched per day
  MAX_PRODUCTIVITY_BONUS: 10, // Maximum productivity bonus points
};

/**
 * Calculate Leaderboard Score
 * Formula:
 * Leaderboard Score = AFS_all_time × (1 - TS_day / (TS_day + K)) + 10 × min(VW_day / 20, 1)
 *
 * @param {number|string} afsAllTime - Average Focus Score calculated from all focus records up to current date
 * @param {number|string} tsDay - Total tab switches on the specific evaluated day
 * @param {number|string} vwDay - Total videos watched on the specific evaluated day
 * @param {number} [k=LEADERBOARD_CONFIG.K] - Configurable tab-switch penalty constant
 * @returns {object} Calculated score details: { score, scoreString, focusComponent, videoBonus, afsAllTime, tsDay, vwDay, k }
 */
export function calculateLeaderboardScore(
  afsAllTime,
  tsDay,
  vwDay,
  k = LEADERBOARD_CONFIG.K
) {
  // 1. Validate / normalize inputs safely (handle null, undefined, strings, NaN, negatives)
  const parsedAfs = Number(afsAllTime);
  const afs = (!isNaN(parsedAfs) && isFinite(parsedAfs))
    ? Math.max(0, Math.min(100, parsedAfs))
    : 0;

  const parsedTs = Number(tsDay);
  const ts = (!isNaN(parsedTs) && isFinite(parsedTs))
    ? Math.max(0, parsedTs)
    : 0;

  const parsedVw = Number(vwDay);
  const vw = (!isNaN(parsedVw) && isFinite(parsedVw))
    ? Math.max(0, parsedVw)
    : 0;

  const parsedK = Number(k);
  const penaltyK = (!isNaN(parsedK) && isFinite(parsedK) && parsedK > 0)
    ? parsedK
    : LEADERBOARD_CONFIG.K;

  // 2. Tab-switch-adjusted focus component
  // Focus Component = AFS_all_time × (1 - TS_day / (TS_day + K))
  // When ts === 0: (1 - 0) = 1 => Focus Component = AFS_all_time
  const tabPenaltyFactor = 1 - (ts / (ts + penaltyK));
  const focusComponent = afs * tabPenaltyFactor;

  // 3. Capped video productivity bonus
  // Video Bonus = 10 × min(VW_day / 20, 1)
  const videoBonus = LEADERBOARD_CONFIG.MAX_PRODUCTIVITY_BONUS * Math.min(vw / LEADERBOARD_CONFIG.DAILY_VIDEO_TARGET, 1);

  // 4. Combine components
  let rawScore = focusComponent + videoBonus;

  // Ensure safe numeric values (no NaN or Infinity)
  if (!isFinite(rawScore) || isNaN(rawScore)) {
    rawScore = 0;
  }

  // Strictly clamp between 0 and 100 (never > 100, never < 0 / negative)
  rawScore = Math.max(0, Math.min(100, rawScore));

  // 5. Round to 2 decimal places
  const roundedScore = Number(rawScore.toFixed(2));

  return {
    score: roundedScore,
    scoreString: roundedScore.toFixed(2),
    focusComponent: Number(focusComponent.toFixed(2)),
    videoBonus: Number(videoBonus.toFixed(2)),
    afsAllTime: Number(afs.toFixed(2)),
    tsDay: ts,
    vwDay: vw,
    k: penaltyK,
  };
}
