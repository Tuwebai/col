import { execFile } from "node:child_process";
import { promisify } from "node:util";

import * as vscode from "vscode";

const execFileAsync = promisify(execFile);

export interface ColStatusResult {
  ready: boolean;
  config: string;
  agents: string;
  indexCache: string;
  packCache: string;
  indexedFiles: number;
  cachedPacks: number;
  averageSavedPercent: number;
}

export async function runColStatus(workspaceFolder: vscode.WorkspaceFolder): Promise<ColStatusResult> {
  const result = await runColJson<ColStatusResult>(["status", "--json"], workspaceFolder.uri.fsPath);
  return result;
}

async function runColJson<T>(args: string[], cwd: string): Promise<T> {
  try {
    const { stdout } = await execFileAsync("col", args, {
      cwd,
      windowsHide: true
    });

    return JSON.parse(stdout) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo ejecutar col";
    throw new Error(message);
  }
}
