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

export function formatPackCodex(plan: PlanResult, pack: PackResult): string {
  const lines = [
    "# COL Codex Packet",
    "",
    "## Task",
    plan.task,
    "",
    "## Rules"
  ];

  if (plan.rules.rules.length === 0) {
    lines.push("-");
  }

  for (const rule of plan.rules.rules) {
    lines.push(`- ${rule}`);
  }

  lines.push("");
  lines.push("## Budget");
  lines.push(`- maxFiles: ${plan.budget.maxFiles}`);
  lines.push(`- maxLinesPerFile: ${plan.budget.maxLinesPerFile}`);
  lines.push(`- maxTotalLines: ${plan.budget.maxTotalLines}`);
  lines.push(`- matchWindow: ${plan.budget.matchWindow}`);
  lines.push("");
  lines.push("## Candidates");

  if (plan.candidates.length === 0) {
    lines.push("-");
  }

  for (const candidate of plan.candidates) {
    lines.push(`- ${candidate.path} (score=${candidate.score})`);
  }

  lines.push("");
  lines.push("## Context");
  lines.push(`- totalFiles: ${pack.totalFiles}`);
  lines.push(`- sourceLines: ${pack.sourceLines}`);
  lines.push(`- totalLines: ${pack.totalLines}`);
  lines.push(`- savedLines: ${pack.savedLines}`);
  lines.push(`- savedPercent: ${pack.savedPercent}`);
  lines.push(`- cacheHit: ${pack.cacheHit ? "true" : "false"}`);

  for (const fragment of pack.fragments) {
    lines.push("");
    lines.push(`### File: ${fragment.path}`);
    lines.push(`- score: ${fragment.score}`);
    lines.push(`- budget: ${fragment.budget}`);
    lines.push(`- lines: ${fragment.lines}`);
    lines.push("");
    lines.push(`\`\`\`${detectFenceLanguage(fragment.path)}`);
    lines.push(fragment.excerpt);
    lines.push("```");
  }

  return lines.join("\n");
}

function detectFenceLanguage(path: string): string {
  if (path.endsWith(".ts")) {
    return "ts";
  }

  if (path.endsWith(".tsx")) {
    return "tsx";
  }

  if (path.endsWith(".js")) {
    return "js";
  }

  if (path.endsWith(".jsx")) {
    return "jsx";
  }

  if (path.endsWith(".json")) {
    return "json";
  }

  if (path.endsWith(".md")) {
    return "md";
  }

  if (path.endsWith(".sql")) {
    return "sql";
  }

  return "text";
}
