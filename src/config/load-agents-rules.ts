import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import type { AgentRuleSet } from "../types/index.js";

const DEFAULT_RULES: AgentRuleSet = {
  source: null,
  rules: []
};

export async function loadAgentsRules(cwd: string): Promise<AgentRuleSet> {
  const filePath = resolve(cwd, "AGENTS.md");

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return DEFAULT_RULES;
  }

  const raw = await readFile(filePath, "utf8");
  const rules = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

  return {
    source: "AGENTS.md",
    rules
  };
}
