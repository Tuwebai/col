import type { CacheStats } from "../types/index.js";

export function formatStats(stats: CacheStats): string {
  const lines = [
    "[stats]",
    `indexedFiles=${stats.indexedFiles}`,
    `cachedPacks=${stats.cachedPacks}`,
    `averageSavedLines=${stats.averageSavedLines}`,
    `averageSavedPercent=${stats.averageSavedPercent}`,
    "",
    "[cachedTasks]"
  ];

  if (stats.cachedTasks.length === 0) {
    lines.push("-");
    return lines.join("\n");
  }

  for (const task of stats.cachedTasks) {
    lines.push(`- ${task}`);
  }

  return lines.join("\n");
}
