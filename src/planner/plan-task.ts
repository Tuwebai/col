import type {
  AgentRuleSet,
  ColConfig,
  DomainRule,
  FileIndexEntry,
  PlanResult
} from "../types/index.js";

const STOP_WORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "para",
  "con",
  "sin",
  "una",
  "uno",
  "que",
  "del",
  "por",
  "en",
  "y"
]);

const KEYWORD_ALIASES: Record<string, string[]> = {
  auth: ["authentication", "login", "session"],
  docs: ["documentation", "readme", "md"],
  config: ["settings", "json", "env"],
  api: ["http", "endpoint", "client"]
};

export function planTask(
  task: string,
  index: FileIndexEntry[],
  config: ColConfig,
  rules: AgentRuleSet
): PlanResult {
  const keywords = extractKeywords(task);
  const budget = deriveBudget(config, rules);
  const candidates = scoreCandidatesWithConfig(index, task, keywords, config.domainRules).slice(0, budget.maxFiles);

  return {
    task,
    keywords,
    rules,
    candidates,
    budget
  };
}

function extractKeywords(task: string): string[] {
  const normalized = task.toLowerCase();

  const baseKeywords = normalized
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token));

  const expandedKeywords = new Set<string>();

  for (const keyword of baseKeywords) {
    expandedKeywords.add(keyword);

    const singular = keyword.endsWith("s") ? keyword.slice(0, -1) : keyword;

    if (singular.length >= 3) {
      expandedKeywords.add(singular);
    }

    for (const alias of KEYWORD_ALIASES[keyword] ?? []) {
      expandedKeywords.add(alias);
    }
  }

  return [...expandedKeywords];
}

export function scoreCandidatesWithConfig(
  entries: FileIndexEntry[],
  task: string,
  keywords: string[],
  domainRules: DomainRule[]
): FileIndexEntry[] {
  const taskText = task.toLowerCase();

  return entries
    .map((entry) => ({
      ...entry,
      score:
        entry.score +
        scoreKeywordMatches(entry, keywords) +
        scorePathMatches(entry, keywords) +
        scoreIntent(entry, taskText) +
        domainRules.reduce((total, rule) => {
          return total + scoreDomainRule(entry, keywords, rule);
        }, 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

function deriveBudget(
  config: ColConfig,
  rules: AgentRuleSet
): PlanResult["budget"] {
  const normalizedRules = rules.rules.map((rule) => rule.toLowerCase());
  const strictExploration = normalizedRules.some((rule) => {
    return rule.includes("no explorar") || rule.includes("cambio minimo");
  });

  return {
    maxFiles: strictExploration ? Math.min(config.maxFiles, 3) : config.maxFiles,
    maxLinesPerFile: config.maxLinesPerFile,
    matchWindow: config.matchWindow
  };
}

function scoreKeywordMatches(entry: FileIndexEntry, keywords: string[]): number {
  return keywords.reduce((total, keyword) => {
    return total + (entry.tags.includes(keyword) ? 5 : 0);
  }, 0);
}

function scorePathMatches(entry: FileIndexEntry, keywords: string[]): number {
  const normalizedPath = entry.path.toLowerCase();
  const filename = normalizedPath.split("/").at(-1) ?? normalizedPath;

  return keywords.reduce((total, keyword) => {
    let score = total;

    if (normalizedPath.includes(`/${keyword}/`) || normalizedPath.startsWith(`${keyword}/`)) {
      score += 6;
    }

    if (normalizedPath.includes(keyword)) {
      score += 3;
    }

    if (filename.startsWith(keyword) || filename.includes(`${keyword}.`)) {
      score += 4;
    }

    return score;
  }, 0);
}

function scoreIntent(entry: FileIndexEntry, task: string): number {
  const wantsDocs = /(doc|docs|readme|document)/.test(task);
  const wantsCode = /(fix|bug|refactor|agregar|crear|cambiar|update|implement)/.test(task);

  if (wantsDocs && entry.path.startsWith("docs/")) {
    return 5;
  }

  if (wantsCode && (entry.path.startsWith("src/") || entry.path.endsWith(".ts") || entry.path.endsWith(".tsx"))) {
    return 5;
  }

  if (wantsCode && entry.path.startsWith("docs/")) {
    return -2;
  }

  return 0;
}

function scoreDomainRule(
  entry: FileIndexEntry,
  keywords: string[],
  rule: DomainRule
): number {
  const matchedKeyword = keywords.some((keyword) => {
    return rule.matchTags.includes(keyword) || rule.matchPaths.some((path) => keyword.includes(path));
  });

  if (!matchedKeyword) {
    return 0;
  }

  const matchedTag = rule.matchTags.some((tag) => entry.tags.includes(tag));
  const matchedPath = rule.matchPaths.some((path) => entry.path.includes(path));

  return matchedTag || matchedPath ? rule.boost : 0;
}
