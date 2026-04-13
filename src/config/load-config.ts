import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ColConfig } from "../types/index.js";

const DEFAULT_CONFIG_PATH = "col.config.json";

export async function loadConfig(cwd: string): Promise<ColConfig> {
  const configPath = resolve(cwd, DEFAULT_CONFIG_PATH);
  const raw = await readFile(configPath, "utf8");

  return JSON.parse(raw) as ColConfig;
}
