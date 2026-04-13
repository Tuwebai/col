import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import type { ColConfig, PackResult, PlanResult } from "../types/index.js";

export async function packContext(
  cwd: string,
  plan: PlanResult,
  config: ColConfig
): Promise<PackResult> {
  const fragments = [];
  let sourceLines = 0;

  for (const candidate of plan.candidates) {
    const absolutePath = resolve(cwd, candidate.path);
    const raw = await readFile(absolutePath, "utf8");
    const fileStat = await stat(absolutePath);
    const lines = raw.split(/\r?\n/);
    sourceLines += lines.length;
    const excerptLines = selectExcerpt(lines, plan.keywords, config.maxLinesPerFile, plan.budget.matchWindow);

    fragments.push({
      path: candidate.path,
      excerpt: excerptLines.join("\n"),
      lines: excerptLines.length,
      score: candidate.score,
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size
    });
  }

  const totalLines = fragments.reduce((sum, fragment) => sum + fragment.lines, 0);
  const savedLines = Math.max(sourceLines - totalLines, 0);
  const savedPercent = sourceLines === 0 ? 0 : Math.round((savedLines / sourceLines) * 100);

  return {
    task: plan.task,
    totalFiles: fragments.length,
    totalLines,
    sourceLines,
    savedLines,
    savedPercent,
    fragments
  };
}

function selectExcerpt(
  lines: string[],
  keywords: string[],
  maxLines: number,
  matchWindow: number
): string[] {
  const matchIndexes = findMatchIndexes(lines, keywords);

  if (matchIndexes.length === 0) {
    return lines.slice(0, maxLines);
  }

  const excerptIndexes = collectExcerptIndexes(lines.length, matchIndexes, maxLines, matchWindow);

  return excerptIndexes.map((index) => lines[index]);
}

function findMatchIndexes(lines: string[], keywords: string[]): number[] {
  if (keywords.length === 0) {
    return [];
  }

  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const indexes: number[] = [];

  for (const [index, line] of lines.entries()) {
    const normalizedLine = line.toLowerCase();

    if (normalizedKeywords.some((keyword) => normalizedLine.includes(keyword))) {
      indexes.push(index);
    }
  }

  return indexes;
}

function collectExcerptIndexes(
  totalLines: number,
  matchIndexes: number[],
  maxLines: number,
  matchWindow: number
): number[] {
  const selected = new Set<number>();

  for (const matchIndex of matchIndexes) {
    const start = Math.max(0, matchIndex - matchWindow);
    const end = Math.min(totalLines, matchIndex + matchWindow + 1);

    for (let index = start; index < end; index += 1) {
      selected.add(index);

      if (selected.size >= maxLines) {
        return [...selected].sort((left, right) => left - right);
      }
    }
  }

  return [...selected].sort((left, right) => left - right);
}
