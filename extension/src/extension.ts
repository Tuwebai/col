import * as vscode from "vscode";

import { createColViewProvider } from "./webview/provider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = createColViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("col.sidebar", provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("col.openPanel", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.col");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("col.refreshStatus", async () => {
      await provider.refresh();
    })
  );
}

export function deactivate(): void {}
