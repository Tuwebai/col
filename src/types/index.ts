export interface ToolLimits {
  searchMatches: number;
  diffFiles: number;
  logLines: number;
}

export interface DomainRule {
  name: string;
  matchTags: string[];
  matchPaths: string[];
  boost: number;
}

export interface ColConfig {
  entrypoints: string[];
  ignore: string[];
  maxFiles: number;
  maxLinesPerFile: number;
  maxTotalLines: number;
  matchWindow: number;
  domainRules: DomainRule[];
  toolLimits: ToolLimits;
}

export interface AgentRuleSet {
  source: string | null;
  rules: string[];
}

export interface FileIndexEntry {
  path: string;
  tags: string[];
  score: number;
  mtimeMs: number;
  size: number;
}

export interface PlanResult {
  task: string;
  keywords: string[];
  candidates: FileIndexEntry[];
  rules: AgentRuleSet;
  budget: {
    maxFiles: number;
    maxLinesPerFile: number;
    maxTotalLines: number;
    matchWindow: number;
  };
}

export interface PackedFragment {
  path: string;
  excerpt: string;
  lines: number;
  budget: number;
  score: number;
  mtimeMs?: number;
  size?: number;
}

export interface PackResult {
  task: string;
  totalFiles: number;
  totalLines: number;
  sourceLines: number;
  savedLines: number;
  savedPercent: number;
  cacheHit?: boolean;
  fragments: PackedFragment[];
}

export interface CacheStats {
  indexedFiles: number;
  cachedPacks: number;
  cachedTasks: string[];
  averageSavedLines: number;
  averageSavedPercent: number;
}
