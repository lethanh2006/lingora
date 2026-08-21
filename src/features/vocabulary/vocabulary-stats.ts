export function calculatePracticeStreak(dateIds: string[], todayId: string): number {
  const uniqueDates = new Set(dateIds);
  const today = new Date(`${todayId}T00:00:00.000Z`);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayId = yesterday.toISOString().slice(0, 10);

  const cursor = uniqueDates.has(todayId) ? today : uniqueDates.has(yesterdayId) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  while (uniqueDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
