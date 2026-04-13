(function () {
  const vscode = acquireVsCodeApi();
  const statusRoot = document.getElementById("statusRoot");
  const refreshButton = document.getElementById("refreshButton");

  refreshButton?.addEventListener("click", () => {
    vscode.postMessage({ type: "refresh" });
  });

  window.addEventListener("message", (event) => {
    const message = event.data;

    if (message?.type !== "status") {
      return;
    }

    renderStatus(message.payload);
  });

  function renderStatus(payload) {
    if (!statusRoot) {
      return;
    }

    if (payload.state === "error") {
      statusRoot.innerHTML = `
        <div class="error">${escapeHtml(payload.message)}</div>
      `;
      return;
    }

    const status = payload.status;

    statusRoot.innerHTML = `
      <div class="pill ${status.ready ? "ok" : "warn"}">ready=${status.ready}</div>
      <div class="item"><span>workspace</span><strong>${escapeHtml(payload.workspace)}</strong></div>
      <div class="item"><span>config</span><strong>${escapeHtml(status.config)}</strong></div>
      <div class="item"><span>agents</span><strong>${escapeHtml(status.agents)}</strong></div>
      <div class="item"><span>indexCache</span><strong>${escapeHtml(status.indexCache)}</strong></div>
      <div class="item"><span>packCache</span><strong>${escapeHtml(status.packCache)}</strong></div>
      <div class="item"><span>indexedFiles</span><strong>${status.indexedFiles}</strong></div>
      <div class="item"><span>cachedPacks</span><strong>${status.cachedPacks}</strong></div>
      <div class="item"><span>avgSaved</span><strong>${status.averageSavedPercent}%</strong></div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
