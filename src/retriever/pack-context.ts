import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { governToolOutput } from "../governor/govern-tool-output.js";
import type { ColConfig, PackResult, PlanResult } from "../types/index.js";

export async function packContext(
  cwd: string,
  plan: PlanResult,
  config: ColConfig
): Promise<PackResult> {
  const fragments = [];
  const fragmentBudgets = buildFragmentBudgets(
    plan.candidates.length,
    plan.budget.maxLinesPerFile,
    plan.budget.maxTotalLines
  );
  const seenExcerpts = new Set<string>();
  let sourceLines = 0;

  for (const [index, candidate] of plan.candidates.entries()) {
    const absolutePath = resolve(cwd, candidate.path);
    const raw = await readFile(absolutePath, "utf8");
    const fileStat = await stat(absolutePath);
    const lines = raw.split(/\r?\n/);
    const fragmentBudget = fragmentBudgets[index] ?? plan.budget.maxLinesPerFile;
    sourceLines += lines.length;
    const excerptLines = selectExcerpt(
      lines,
      plan.keywords,
      fragmentBudget,
      plan.budget.matchWindow
    );
    const governedExcerptLines = maybeGovernFragment(excerptLines, plan.budget.matchWindow, config);
    const normalizedExcerpt = normalizeExcerpt(governedExcerptLines);

    if (normalizedExcerpt.length === 0 || seenExcerpts.has(normalizedExcerpt)) {
      continue;
    }

    seenExcerpts.add(normalizedExcerpt);

    fragments.push({
      path: candidate.path,
      excerpt: governedExcerptLines.join("\n"),
      lines: governedExcerptLines.length,
      budget: fragmentBudget,
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

function maybeGovernFragment(lines: string[], matchWindow: number, config: ColConfig): string[] {
  if (lines.length <= matchWindow) {
    return lines;
  }

  const governed = governToolOutput("log", lines.join("\n"), config);

  if (governed.content.length === 0) {
    return lines.slice(0, matchWindow);
  }

  return governed.content.split(/\r?\n/).slice(0, Math.min(lines.length, config.toolLimits.logLines));
}

function buildFragmentBudgets(
  totalCandidates: number,
  maxLinesPerFile: number,
  maxTotalLines: number
): number[] {
  if (totalCandidates === 0) {
    return [];
  }

  const baseBudget = Math.max(20, Math.min(maxLinesPerFile, Math.floor(maxTotalLines / totalCandidates)));
  const budgets = Array.from({ length: totalCandidates }, () => baseBudget);
  let remaining = Math.max(maxTotalLines - baseBudget * totalCandidates, 0);
  let cursor = 0;

  while (remaining > 0 && totalCandidates > 0) {
    if (budgets[cursor] < maxLinesPerFile) {
      budgets[cursor] += 1;
      remaining -= 1;
    }

    cursor = (cursor + 1) % totalCandidates;

    if (budgets.every((budget) => budget >= maxLinesPerFile)) {
      break;
    }
  }

  return budgets;
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

function normalizeExcerpt(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
