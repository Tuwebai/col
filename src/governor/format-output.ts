import type { PackResult, PlanResult } from "../types/index.js";

export function formatPlan(plan: PlanResult): string {
  const lines = [
    "[plan]",
    `task=${plan.task}`,
    `keywords=${plan.keywords.join(", ") || "-"}`,
    `budget.maxFiles=${plan.budget.maxFiles}`,
    `budget.maxLinesPerFile=${plan.budget.maxLinesPerFile}`,
    `budget.maxTotalLines=${plan.budget.maxTotalLines}`,
    `budget.matchWindow=${plan.budget.matchWindow}`,
    `rules.source=${plan.rules.source ?? "-"}`,
    "",
    "[rules]"
  ];

  if (plan.rules.rules.length === 0) {
    lines.push("-");
  }

  for (const rule of plan.rules.rules) {
    lines.push(`- ${rule}`);
  }

  lines.push("");
  lines.push("[candidates]");

  if (plan.candidates.length === 0) {
    lines.push("-");
  }

  for (const candidate of plan.candidates) {
    lines.push(`- ${candidate.path} [score=${candidate.score}]`);
  }

  return lines.join("\n");
}

export function formatPack(pack: PackResult): string {
  const lines = [
    "[pack]",
    `task=${pack.task}`,
    `totalFiles=${pack.totalFiles}`,
    `sourceLines=${pack.sourceLines}`,
    `totalLines=${pack.totalLines}`,
    `savedLines=${pack.savedLines}`,
    `savedPercent=${pack.savedPercent}`,
    `cacheHit=${pack.cacheHit ? "true" : "false"}`
  ];

  for (const fragment of pack.fragments) {
    lines.push("");
    lines.push(`[fragment] ${fragment.path} score=${fragment.score} budget=${fragment.budget}`);
    lines.push(fragment.excerpt);
  }

  return lines.join("\n");
}
