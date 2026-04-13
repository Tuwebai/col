import { access, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import type { CacheStats, ColConfig, FileIndexEntry, PackResult } from "../types/index.js";

const INDEX_CACHE_FILE = ".col-index.json";
const PACK_CACHE_FILE = ".col-pack-cache.json";

interface IndexCachePayload {
  files: FileIndexEntry[];
}

interface PackCacheEntry {
  task: string;
  createdAt: number;
  result: PackResult;
}

interface PackCachePayload {
  entries: PackCacheEntry[];
}

export async function readIndexCache(cwd: string): Promise<FileIndexEntry[] | null> {
  const filePath = resolve(cwd, INDEX_CACHE_FILE);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as IndexCachePayload;

  const isValid = await isIndexCacheValid(cwd, parsed.files);

  return isValid ? parsed.files : null;
}

export async function writeIndexCache(cwd: string, files: FileIndexEntry[]): Promise<void> {
  const filePath = resolve(cwd, INDEX_CACHE_FILE);
  const payload: IndexCachePayload = { files };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readPackCache(cwd: string, task: string, config: ColConfig): Promise<PackResult | null> {
  const filePath = resolve(cwd, PACK_CACHE_FILE);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as PackCachePayload;
  const match = parsed.entries.find((entry) => entry.task === task);

  if (!match) {
    return null;
  }

  const isValid = await isPackResultValid(cwd, match.result, match.createdAt, config.packCacheTtlMs);

  return isValid ? match.result : null;
}

export async function writePackCache(cwd: string, task: string, result: PackResult): Promise<void> {
  const filePath = resolve(cwd, PACK_CACHE_FILE);
  const existing = await readPackCacheFile(cwd);
  const nextEntries = existing.entries.filter((entry) => entry.task !== task);

  nextEntries.push({ task, createdAt: Date.now(), result });

  const payload: PackCachePayload = {
    entries: nextEntries.slice(-20)
  };

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readCacheStats(cwd: string): Promise<CacheStats> {
  const indexFiles = await readIndexCache(cwd);
  const packCache = await readPackCacheFile(cwd);
  const totalSavedLines = packCache.entries.reduce((sum, entry) => sum + entry.result.savedLines, 0);
  const totalSavedPercent = packCache.entries.reduce((sum, entry) => sum + entry.result.savedPercent, 0);
  const cachedPacks = packCache.entries.length;

  return {
    indexedFiles: indexFiles?.length ?? 0,
    cachedPacks,
    cachedTasks: packCache.entries.map((entry) => entry.task),
    averageSavedLines: cachedPacks === 0 ? 0 : Math.round(totalSavedLines / cachedPacks),
    averageSavedPercent: cachedPacks === 0 ? 0 : Math.round(totalSavedPercent / cachedPacks)
  };
}

export async function clearCache(
  cwd: string,
  target: "all" | "index" | "pack"
): Promise<{ cleared: string[] }> {
  const cleared: string[] = [];

  if (target === "all" || target === "index") {
    const removed = await removeIfExists(resolve(cwd, INDEX_CACHE_FILE));

    if (removed) {
      cleared.push(INDEX_CACHE_FILE);
    }
  }

  if (target === "all" || target === "pack") {
    const removed = await removeIfExists(resolve(cwd, PACK_CACHE_FILE));

    if (removed) {
      cleared.push(PACK_CACHE_FILE);
    }
  }

  return { cleared };
}

async function readPackCacheFile(cwd: string): Promise<PackCachePayload> {
  const filePath = resolve(cwd, PACK_CACHE_FILE);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return { entries: [] };
  }

  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as PackCachePayload;
}

async function isIndexCacheValid(cwd: string, files: FileIndexEntry[]): Promise<boolean> {
  for (const file of files) {
    const current = await readFileFingerprint(cwd, file.path);

    if (!current) {
      return false;
    }

    if (current.mtimeMs !== file.mtimeMs || current.size !== file.size) {
      return false;
    }
  }

  return true;
}

async function isPackResultValid(
  cwd: string,
  result: PackResult,
  createdAt: number,
  ttlMs: number
): Promise<boolean> {
  if (Date.now() - createdAt > ttlMs) {
    return false;
  }

  for (const fragment of result.fragments) {
    const current = await readFileFingerprint(cwd, fragment.path);

    if (!current) {
      return false;
    }

    if (fragment.mtimeMs !== current.mtimeMs || fragment.size !== current.size) {
      return false;
    }
  }

  return true;
}

async function readFileFingerprint(
  cwd: string,
  path: string
): Promise<{ mtimeMs: number; size: number } | null> {
  try {
    const fileStat = await stat(resolve(cwd, path));

    return {
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size
    };
  } catch {
    return null;
  }
}

async function removeIfExists(path: string): Promise<boolean> {
  try {
    await rm(path, { force: true });
    return true;
  } catch {
    return false;
  }
}
