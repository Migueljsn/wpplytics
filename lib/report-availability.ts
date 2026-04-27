export function getReportAvailability(firstMessageAt: Date | null, now = new Date()) {
  if (!firstMessageAt) {
    return {
      minimumDaysMet: false,
      earliestAnalyzableAt: null,
      collectedDays: 0,
    };
  }

  const diffMs = now.getTime() - firstMessageAt.getTime();
  const collectedDays = Math.max(1, Math.floor(diffMs / 86400000) + 1);
  const earliestAnalyzableAt = new Date(firstMessageAt.getTime() + 4 * 86400000);

  return {
    minimumDaysMet: collectedDays >= 5,
    earliestAnalyzableAt: earliestAnalyzableAt.toISOString(),
    collectedDays,
  };
}
