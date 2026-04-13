#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { Command } from "commander";

import type { ColConfig, PackResult, PlanResult } from "../types/index.js";
import {
  clearCache,
  readIndexCache,
  readPackCache,
  readCacheStats,
  writeIndexCache,
  writePackCache
} from "../cache/store.js";
import { loadAgentsRules } from "../config/load-agents-rules.js";
import { loadConfig } from "../config/load-config.js";
import { formatGovern } from "../governor/format-govern.js";
import { governToolOutput } from "../governor/govern-tool-output.js";
import { formatPack, formatPackCodex, formatPlan } from "../governor/format-output.js";
import { formatStats } from "../governor/format-stats.js";
import { buildIndex } from "../indexer/build-index.js";
import { planTask } from "../planner/plan-task.js";
import { packContext } from "../retriever/pack-context.js";

const program = new Command();
const cwd = process.cwd();
const configPath = resolve(cwd, "col.config.json");
const defaultConfig = {
  entrypoints: [],
  ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/coverage/**"
  ],
  maxFiles: 5,
  maxLinesPerFile: 120,
  maxTotalLines: 240,
  matchWindow: 20,
  domainMappings: [
    {
      name: "auth",
      aliases: ["auth", "authentication", "login", "session"],
      paths: ["src/features/auth/", "src/core/auth/", "src/auth/"],
      tags: ["auth", "login", "session"],
      boost: 20
    },
    {
      name: "api",
      aliases: ["api", "http", "endpoint", "client"],
      paths: ["src/features/api/", "src/core/api/", "src/api/"],
      tags: ["api", "http", "client"],
      boost: 18
    },
    {
      name: "cli",
      aliases: ["cli", "command", "terminal"],
      paths: ["src/cli/", "extension/src/cli/"],
      tags: ["cli", "command"],
      boost: 20
    }
  ],
  domainRules: [
    {
      name: "docs",
      matchTags: ["docs", "md"],
      matchPaths: ["docs/"],
      boost: 2
    },
    {
      name: "source",
      matchTags: ["src", "ts", "tsx", "js"],
      matchPaths: ["src/"],
      boost: 3
    }
  ],
  toolLimits: {
    searchMatches: 8,
    diffFiles: 6,
    logLines: 80
  }
};

program.name("col").description("Context Optimization Layer").version("0.1.0");
program.configureHelp({
  sortSubcommands: true
});
program.addHelpText("after", `
Comandos principales:
  init                Inicializa estructura y config minima
  index               Genera cache de indice del repo
  plan <tarea>        Calcula scope minimo para una tarea
  pack <tarea>        Empaqueta contexto util para el agente
  stats               Muestra metricas y ahorro acumulado
  doctor              Diagnostico rapido del proyecto
  status              Resumen operativo de COL
  help                Muestra esta ayuda

Ejemplos:
  col init
  col index
  col plan "agregar refresh token en auth"
  col plan --domain auth "agregar refresh token"
  col plan --json "agregar refresh token en auth"
  col pack --domain auth --json "agregar refresh token"
  col pack --json "agregar refresh token en auth"
  col pack --codex "agregar refresh token en auth"
  col stats
  col doctor
  col status
  col clear-cache
  col govern search --file rg.txt
`);

program
  .command("init")
  .description("Crea estructura minima")
  .action(async () => {
    await mkdir(resolve(cwd, "docs"), { recursive: true });
    await mkdir(resolve(cwd, "src"), { recursive: true });
    const hasConfig = await exists(configPath);

    if (!hasConfig) {
      await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
    }

    process.stdout.write(`ok config=${hasConfig ? "existing" : "created"}\n`);
  });

program
  .command("index")
  .description("Genera indice liviano")
  .option("--json", "Salida en JSON")
  .action(async (options: { json?: boolean }) => {
    const config = await loadConfig(cwd);
    const index = await buildIndex(cwd, config);
    await writeIndexCache(cwd, index);
    writeOutput(`indexed ${index.length} files`, { indexedFiles: index.length }, options);
  });

program
  .command("plan")
  .description("Planifica contexto minimo")
  .argument("<task>", "Tarea a resolver")
  .option("--domain <domain>", "Fuerza un dominio")
  .option("--json", "Salida en JSON")
  .action(async (task: string, options: { domain?: string; json?: boolean }) => {
    const config = await loadConfig(cwd);
    const rules = await loadAgentsRules(cwd);
    const index = (await readIndexCache(cwd)) ?? (await buildIndex(cwd, config));
    const forcedDomains = resolveDomainOption(options.domain, config);
    const plan = planTask(task, index, config, rules, { forcedDomains });
    writeOutput(formatPlan(plan), plan, options);
  });

program
  .command("pack")
  .description("Empaqueta contexto util")
  .argument("<task>", "Tarea a resolver")
  .option("--domain <domain>", "Fuerza un dominio")
  .option("--json", "Salida en JSON")
  .option("--codex", "Salida lista para Codex")
  .action(async (task: string, options: { domain?: string; json?: boolean; codex?: boolean }) => {
    const config = await loadConfig(cwd);
    const rules = await loadAgentsRules(cwd);
    const index = (await readIndexCache(cwd)) ?? (await buildIndex(cwd, config));
    const forcedDomains = resolveDomainOption(options.domain, config);
    const plan = planTask(task, index, config, rules, { forcedDomains });
    const cacheKey = buildPackCacheKey(task, forcedDomains);
    const cached = await readPackCache(cwd, cacheKey);

    if (cached) {
      writePackOutput(plan, { ...cached, cacheHit: true }, options);
      return;
    }

    const pack = await packContext(cwd, plan, config);
    await writePackCache(cwd, cacheKey, pack);
    writePackOutput(plan, { ...pack, cacheHit: false }, options);
  });

program
  .command("stats")
  .description("Muestra metricas locales")
  .option("--json", "Salida en JSON")
  .action(async (options: { json?: boolean }) => {
    const stats = await readCacheStats(cwd);
    writeOutput(formatStats(stats), stats, options);
  });

program
  .command("doctor")
  .description("Diagnostico rapido del proyecto")
  .option("--json", "Salida en JSON")
  .action(async (options: { json?: boolean }) => {
    const hasConfig = await exists(configPath);
    const hasAgents = await exists(resolve(cwd, "AGENTS.md"));
    const hasIndex = await exists(resolve(cwd, ".col-index.json"));
    const hasPackCache = await exists(resolve(cwd, ".col-pack-cache.json"));
    const stats = await readCacheStats(cwd);

    const doctor = {
      config: hasConfig ? "ok" : "missing",
      agents: hasAgents ? "ok" : "missing",
      indexCache: hasIndex ? "ok" : "missing",
      packCache: hasPackCache ? "ok" : "missing",
      indexedFiles: stats.indexedFiles,
      cachedPacks: stats.cachedPacks,
      averageSavedPercent: stats.averageSavedPercent,
      configValues: null as null | {
        maxFiles: number;
        maxLinesPerFile: number;
        matchWindow: number;
        domainMappings: number;
        domainRules: number;
      }
    };

    const lines = [
      "[doctor]",
      `config=${doctor.config}`,
      `agents=${doctor.agents}`,
      `indexCache=${doctor.indexCache}`,
      `packCache=${doctor.packCache}`,
      `indexedFiles=${doctor.indexedFiles}`,
      `cachedPacks=${doctor.cachedPacks}`,
      `averageSavedPercent=${doctor.averageSavedPercent}`
    ];

    if (hasConfig) {
      const raw = await readFile(configPath, "utf8");
      const config = JSON.parse(raw) as typeof defaultConfig;
      doctor.configValues = {
        maxFiles: config.maxFiles,
        maxLinesPerFile: config.maxLinesPerFile,
        matchWindow: config.matchWindow,
        domainMappings: config.domainMappings.length,
        domainRules: config.domainRules.length
      };
      lines.push("");
      lines.push("[config]");
      lines.push(`maxFiles=${config.maxFiles}`);
      lines.push(`maxLinesPerFile=${config.maxLinesPerFile}`);
      lines.push(`matchWindow=${config.matchWindow}`);
      lines.push(`domainMappings=${config.domainMappings.length}`);
      lines.push(`domainRules=${config.domainRules.length}`);
    }

    writeOutput(lines.join("\n"), doctor, options);
  });

program
  .command("status")
  .description("Resumen operativo de COL")
  .option("--json", "Salida en JSON")
  .action(async (options: { json?: boolean }) => {
    const hasConfig = await exists(configPath);
    const hasAgents = await exists(resolve(cwd, "AGENTS.md"));
    const hasIndex = await exists(resolve(cwd, ".col-index.json"));
    const hasPackCache = await exists(resolve(cwd, ".col-pack-cache.json"));
    const stats = await readCacheStats(cwd);
    const ready = hasConfig && hasIndex;

    const status = {
      ready,
      config: hasConfig ? "ok" : "missing",
      agents: hasAgents ? "ok" : "missing",
      indexCache: hasIndex ? "ok" : "missing",
      packCache: hasPackCache ? "ok" : "missing",
      indexedFiles: stats.indexedFiles,
      cachedPacks: stats.cachedPacks,
      averageSavedPercent: stats.averageSavedPercent
    };

    const lines = [
      "[status]",
      `ready=${ready ? "true" : "false"}`,
      `config=${status.config}`,
      `agents=${status.agents}`,
      `indexCache=${status.indexCache}`,
      `packCache=${status.packCache}`,
      `indexedFiles=${status.indexedFiles}`,
      `cachedPacks=${status.cachedPacks}`,
      `averageSavedPercent=${status.averageSavedPercent}`
    ];

    writeOutput(lines.join("\n"), status, options);
  });

program
  .command("clear-cache")
  .description("Limpia caches locales")
  .option("--index", "Limpia solo el cache de index")
  .option("--pack", "Limpia solo el cache de pack")
  .option("--json", "Salida en JSON")
  .action(async (options: { index?: boolean; pack?: boolean; json?: boolean }) => {
    const target = resolveClearTarget(options);
    const result = await clearCache(cwd, target);
    const lines = [
      "[clear-cache]",
      `target=${target}`,
      "cleared:"
    ];

    if (result.cleared.length === 0) {
      lines.push("-");
    }

    for (const item of result.cleared) {
      lines.push(`- ${item}`);
    }

    writeOutput(lines.join("\n"), { target, cleared: result.cleared }, options);
  });

program
  .command("govern")
  .description("Recorta salida de tools")
  .argument("<kind>", "search | diff | log")
  .option("--file <path>", "Archivo de entrada")
  .option("--json", "Salida en JSON")
  .action(async (
    kind: string,
    options: { file?: string; json?: boolean }
  ) => {
    if (kind !== "search" && kind !== "diff" && kind !== "log") {
      throw new Error("kind invalido");
    }

    const config = await loadConfig(cwd);
    const input = options.file
      ? await readFile(resolve(cwd, options.file), "utf8")
      : await readStdin();
    const result = governToolOutput(kind, input, config);
    writeOutput(formatGovern(result), result, options);
  });

program
  .command("help")
  .description("Muestra ayuda")
  .action(() => {
    program.outputHelp();
  });

program.parseAsync(process.argv);

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveClearTarget(options: { index?: boolean; pack?: boolean }): "all" | "index" | "pack" {
  if (options.index && !options.pack) {
    return "index";
  }

  if (options.pack && !options.index) {
    return "pack";
  }

  return "all";
}

function writeOutput(text: string, data: unknown, options: { json?: boolean }): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${text}\n`);
}

function writePackOutput(
  plan: PlanResult,
  pack: PackResult,
  options: { json?: boolean; codex?: boolean }
): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(pack, null, 2)}\n`);
    return;
  }

  if (options.codex) {
    process.stdout.write(`${formatPackCodex(plan, pack)}\n`);
    return;
  }

  process.stdout.write(`${formatPack(pack)}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function resolveDomainOption(domain: string | undefined, config: ColConfig): string[] {
  if (!domain) {
    return [];
  }

  const forcedDomains = domain
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const available = new Set(config.domainMappings.map((mapping) => mapping.name.toLowerCase()));
  const invalid = forcedDomains.filter((item) => !available.has(item));

  if (invalid.length > 0) {
    throw new Error(`domain invalido: ${invalid.join(", ")}`);
  }

  return forcedDomains;
}

function buildPackCacheKey(task: string, forcedDomains: string[]): string {
  if (forcedDomains.length === 0) {
    return task;
  }

  return `${forcedDomains.slice().sort().join(",")}::${task}`;
}
