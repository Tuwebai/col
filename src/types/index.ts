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

export interface DomainMapping {
  name: string;
  aliases: string[];
  paths: string[];
  tags: string[];
  boost: number;
}

export interface ColConfig {
  entrypoints: string[];
  ignore: string[];
  maxFiles: number;
  maxLinesPerFile: number;
  maxTotalLines: number;
  matchWindow: number;
  domainMappings: DomainMapping[];
  domainRules: DomainRule[];
  toolLimits: ToolLimits;
}

export interface AgentRuleSet {
  source: string | null;
  rules: string[];
  critical: string[];
  standard: string[];
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
  requestedDomains: string[];
  detectedDomains: string[];
  estimatedTokens?: number;
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
  estimatedTokens?: number;
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
