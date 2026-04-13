import * as vscode from "vscode";

import { runColStatus, type ColStatusResult } from "../cli/run-col";

export function createColViewProvider(
  context: vscode.ExtensionContext
): vscode.WebviewViewProvider & { refresh(): Promise<void> } {
  return new ColViewProvider(context);
}

class ColViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: { type?: string }) => {
      if (message.type === "refresh") {
        await this.refresh();
      }
    });

    await this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      this.postMessage({
        type: "status",
        payload: {
          state: "error",
          message: "No hay carpeta abierta"
        }
      });
      return;
    }

    try {
      const status = await runColStatus(workspaceFolder);
      this.postMessage({
        type: "status",
        payload: {
          state: "ok",
          workspace: workspaceFolder.name,
          status
        }
      });
    } catch (error) {
      this.postMessage({
        type: "status",
        payload: {
          state: "error",
          message: error instanceof Error ? error.message : "Error ejecutando col"
        }
      });
    }
  }

  private postMessage(message: { type: string; payload: StatusPayload }): void {
    this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "app.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "app.css")
    );

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}" />
    <title>COL</title>
  </head>
  <body>
    <div class="app">
      <div class="topbar">
        <div>
          <div class="eyebrow">COL</div>
          <h1>Operational Panel</h1>
        </div>
        <button id="refreshButton">Refresh</button>
      </div>

      <section class="card">
        <div class="card-title">Status</div>
        <div id="statusRoot" class="status-grid">
          <div class="muted">Cargando...</div>
        </div>
      </section>
    </div>
    <script src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

type StatusPayload =
  | {
      state: "error";
      message: string;
    }
  | {
      state: "ok";
      workspace: string;
      status: ColStatusResult;
    };
