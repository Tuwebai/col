import type { GovernResult } from "./govern-tool-output.js";

export function formatGovern(result: GovernResult): string {
  const lines = [
    "[govern]",
    `kind=${result.kind}`,
    `sourceLines=${result.sourceLines}`,
    `outputLines=${result.outputLines}`,
    `savedLines=${result.savedLines}`,
    `savedPercent=${result.savedPercent}`,
    "",
    "[content]"
  ];

  if (result.content.length === 0) {
    lines.push("-");
    return lines.join("\n");
  }

  lines.push(result.content);
  return lines.join("\n");
}
