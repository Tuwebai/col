import { estimateCostUsd, isHighTokenEstimate } from "./estimate-tokens.js";

import type { PackResult, PlanResult } from "../types/index.js";

export function formatPlan(plan: PlanResult): string {
  const lines = [
    "[plan]",
    `task=${plan.task}`,
    `requestedDomains=${plan.requestedDomains.join(", ") || "-"}`,
    `keywords=${plan.keywords.join(", ") || "-"}`,
    `domains=${plan.detectedDomains.join(", ") || "-"}`,
    `budget.maxFiles=${plan.budget.maxFiles}`,
    `budget.maxLinesPerFile=${plan.budget.maxLinesPerFile}`,
    `budget.maxTotalLines=${plan.budget.maxTotalLines}`,
    `budget.matchWindow=${plan.budget.matchWindow}`,
    `rules.source=${plan.rules.source ?? "-"}`,
    `rules.critical=${plan.rules.critical.length}`,
    `rules.standard=${plan.rules.standard.length}`,
    `estimatedTokens=${plan.estimatedTokens ?? 0}`,
    `estimatedCost=~$${estimateCostUsd(plan.estimatedTokens ?? 0).toFixed(6)} USD`,
    "",
    "[rules]"
  ];

  if (plan.estimatedTokens && isHighTokenEstimate(plan.estimatedTokens)) {
    lines.push(`[warn] contexto estimado alto: ${plan.estimatedTokens} tokens - considera --domain o reducir maxFiles`);
  }

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
    `estimatedTokens=${pack.estimatedTokens ?? 0}`,
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
  return formatCodex(plan, pack);
}

export function formatCodex(plan: PlanResult, pack: PackResult): string {
  const lines = [
    "## TAREA",
    plan.task,
    "",
    "## REGLAS DEL AGENTE"
  ];

  if (plan.rules.rules.length === 0) {
    lines.push("ninguna");
  }

  for (const rule of plan.rules.rules) {
    lines.push(rule);
  }

  lines.push("");
  lines.push("## BUDGET");
  lines.push(`- maxFiles: ${plan.budget.maxFiles}`);
  lines.push(`- maxLinesPerFile: ${plan.budget.maxLinesPerFile}`);
  lines.push(`- matchWindow: ${plan.budget.matchWindow}`);
  lines.push(`- savedPercent: ${pack.savedPercent}%`);
  lines.push("");
  lines.push("## CONTEXTO");

  for (const fragment of pack.fragments) {
    lines.push("");
    lines.push(`### ${fragment.path}`);
    lines.push(`\`\`\`${detectFenceLanguage(fragment.path)}`);
    lines.push(fragment.excerpt);
    lines.push("```");
  }

  lines.push("");
  lines.push("## MÉTRICAS");
  lines.push(`- totalFiles: ${pack.totalFiles}`);
  lines.push(`- sourceLines: ${pack.sourceLines}`);
  lines.push(`- totalLines: ${pack.totalLines}`);
  lines.push(`- savedLines: ${pack.savedLines}`);
  lines.push(`- cacheHit: ${pack.cacheHit ? "true" : "false"}`);

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
