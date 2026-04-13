import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import type { AgentRuleSet } from "../types/index.js";

const DEFAULT_RULES: AgentRuleSet = {
  source: null,
  rules: [],
  critical: [],
  standard: []
};

export async function loadAgentsRules(cwd: string): Promise<AgentRuleSet> {
  const filePath = resolve(cwd, "AGENTS.md");

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return DEFAULT_RULES;
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = parseAgentRules(raw);

  return {
    source: "AGENTS.md",
    rules: parsed.rules,
    critical: parsed.critical,
    standard: parsed.standard
  };
}

function parseAgentRules(raw: string): Omit<AgentRuleSet, "source"> {
  const rules: string[] = [];
  const critical: string[] = [];
  const standard: string[] = [];
  let currentSection = "";

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.slice(3).trim();
      continue;
    }

    if (!trimmed.startsWith("- ")) {
      continue;
    }

    const rule = trimmed.slice(2).trim();

    if (rule.length === 0) {
      continue;
    }

    rules.push(rule);

    const severity = classifySection(currentSection);

    if (severity === "critical") {
      critical.push(rule);
      continue;
    }

    if (severity === "standard") {
      standard.push(rule);
    }
  }

  return {
    rules,
    critical,
    standard
  };
}

function classifySection(section: string): "critical" | "standard" | "info" {
  const normalized = normalizeText(section);

  if (matchesAny(normalized, ["never", "prohibido", "critico", "critical", "nunca"])) {
    return "critical";
  }

  if (matchesAny(normalized, ["reglas", "rules", "work", "trabajo"])) {
    return "standard";
  }

  return "info";
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
