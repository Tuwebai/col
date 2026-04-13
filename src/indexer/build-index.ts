import fg from "fast-glob";
import { stat } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import type { ColConfig, FileIndexEntry } from "../types/index.js";

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".sql"
];

export async function buildIndex(cwd: string, config: ColConfig): Promise<FileIndexEntry[]> {
  const files = await fg(["**/*"], {
    cwd,
    ignore: config.ignore,
    onlyFiles: true,
    dot: false
  });

  const supportedFiles = files.filter((file) => {
    return SUPPORTED_EXTENSIONS.some((extension) => file.endsWith(extension));
  });

  const entries = await Promise.all(
    supportedFiles.map(async (path) => {
      const fileStat = await stat(resolve(cwd, path));

      return {
        path,
        tags: deriveTags(path),
        score: baseScore(path, config.entrypoints),
        mtimeMs: fileStat.mtimeMs,
        size: fileStat.size
      };
    })
  );

  return entries.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

function deriveTags(path: string): string[] {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  const fileName = basename(normalizedPath);
  const fileExtension = extname(fileName).replace(".", "");
  const fileNameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  const directory = dirname(normalizedPath);
  const rawTags = normalizedPath
    .split(/[\\/._-]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const derived = [
    ...rawTags,
    fileExtension,
    fileName,
    fileNameWithoutExtension,
    ...directory.split("/").filter(Boolean).map((segment) => `${segment}-dir`),
    normalizedPath.startsWith("src/") ? "code" : "",
    normalizedPath.startsWith("docs/") ? "docs" : "",
    fileNameWithoutExtension === "index" ? "entry-file" : ""
  ];

  return [...new Set(derived.filter(Boolean))];
}

function baseScore(path: string, entrypoints: string[]): number {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  let score = 0;

  if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
    score += 4;
  }

  if (normalizedPath.includes("/src/") || normalizedPath.startsWith("src/")) {
    score += 3;
  }

  if (normalizedPath.startsWith("docs/")) {
    score += 1;
  }

  if (normalizedPath.includes("index")) {
    score += 1;
  }

  if (entrypoints.includes(path)) {
    score += 5;
  }

  return score;
}
