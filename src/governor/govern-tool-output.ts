import type { ColConfig } from "../types/index.js";

export interface GovernResult {
  kind: "search" | "diff" | "log";
  sourceLines: number;
  outputLines: number;
  savedLines: number;
  savedPercent: number;
  content: string;
}

export function governToolOutput(
  kind: "search" | "diff" | "log",
  input: string,
  config: ColConfig
): GovernResult {
  const lines = normalizeLines(input);
  const limited = applyLimit(kind, lines, config);
  const sourceLines = lines.length;
  const outputLines = limited.length;
  const savedLines = Math.max(sourceLines - outputLines, 0);
  const savedPercent = sourceLines === 0 ? 0 : Math.round((savedLines / sourceLines) * 100);

  return {
    kind,
    sourceLines,
    outputLines,
    savedLines,
    savedPercent,
    content: limited.join("\n")
  };
}

function applyLimit(
  kind: "search" | "diff" | "log",
  lines: string[],
  config: ColConfig
): string[] {
  if (kind === "search") {
    return lines.slice(0, config.toolLimits.searchMatches);
  }

  if (kind === "diff") {
    return limitDiff(lines, config.toolLimits.diffFiles);
  }

  return dedupeLogs(lines).slice(0, config.toolLimits.logLines);
}

function limitDiff(lines: string[], maxFiles: number): string[] {
  const output: string[] = [];
  let filesSeen = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      filesSeen += 1;

      if (filesSeen > maxFiles) {
        break;
      }
    }

    if (filesSeen === 0 && line.trim() !== "") {
      filesSeen = 1;
    }

    if (filesSeen <= maxFiles) {
      output.push(line);
    }
  }

  return output;
}

function dedupeLogs(lines: string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const normalized = line.trim();

    if (normalized === "") {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(line);
  }

  return output;
}

function normalizeLines(input: string): string[] {
  if (input.length === 0) {
    return [];
  }

  return input.split(/\r?\n/);
}
