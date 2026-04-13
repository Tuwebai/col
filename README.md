<div align="center">

<br />

```
 ██████╗ ██████╗ ██╗
██╔════╝██╔═══██╗██║
██║     ██║   ██║██║
██║     ██║   ██║██║
╚██████╗╚██████╔╝███████╗
 ╚═════╝ ╚═════╝ ╚══════╝
```

### Context Optimization Layer

**Stop feeding your AI agent the entire codebase. Give it only what matters.**

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-orange?style=flat-square)]()

<br />

[**Quickstart**](#-quickstart) · [**CLI Reference**](#-cli-reference) · [**Configuration**](#-configuration) · [**How It Works**](#-how-it-works) · [**Roadmap**](#-roadmap)

<br />

</div>

---

## The Problem

Every time you run a task with an AI coding agent (Codex, Claude Code, Cursor), it reads everything it thinks might be relevant:

```
cat src/App.tsx          → 2,100 tokens
cat src/AppContext.tsx   → 3,500 tokens
grep -r "auth" src/      →   800 tokens
cat src/api/auth.ts      →   700 tokens
cat src/types/index.ts   →   500 tokens
```

**That's ~7,600 tokens of exploration before a single line of code is written.** On a task that only needed 2 files and 400 tokens of actual context.

COL fixes this.

---

## The Solution

COL sits between you and the agent. Before any task reaches your AI, COL:

1. **Plans** the minimum scope needed for that task
2. **Retrieves** only the relevant file fragments
3. **Governs** tool outputs like grep, diff, and logs
4. **Exports** a ready-to-use context package

```
Without COL:  agent reads 7 files + 3 greps = ~7,600 tokens
With COL:     agent reads 1 package file   =    ~600 tokens

                                    Savings: ~92%
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗂️ **Smart Indexing** | Lightweight repo index using path heuristics — no embeddings required |
| 🎯 **Domain Mapping** | Declare `auth → src/features/auth/` and COL finds the right files every time |
| ✂️ **Fragment Extraction** | Returns only the lines around keyword matches, not entire files |
| 🧠 **AGENTS.md Aware** | Reads your agent rules, classifies them by severity, adjusts budget automatically |
| ⚡ **Pack Cache** | Same task + same files = instant response. Invalidates on mtime/size changes |
| 🔒 **Tool Governor** | Trims grep results, git diffs, and logs before they hit the context window |
| 📦 **Codex Export** | Generates a `.md` package with context, rules, and budget ready to attach |
| 📊 **Token Estimator** | Shows estimated tokens and cost before you run the task |
| 🧩 **VS Code Extension** | Panel sidebar with status, task composer, and savings metrics *(beta)* |
| 🔢 **JSON Output** | Every command supports `--json` for pipeline and IDE integration |

---

## 📦 Installation

```bash
npx @tuwebai/col init
```

o

```bash
npm install -g @tuwebai/col
col init
```

### From source

```bash
git clone https://github.com/Tuwebai/col.git
cd col
npm install
npm run build
npm link
```

After `npm link`, the `col` command is available globally in any project.

### Requirements

- Node.js 20+
- TypeScript 5.x (dev dependency, bundled)

---

## 🚀 Quickstart

```bash
# 1. Initialize COL in your project
cd my-project
npx @tuwebai/col init

# o, si ya lo instalaste globalmente:
npm install -g @tuwebai/col
col init

# 2. Edit col.config.json with your domain mappings (see Configuration)

# 3. Index the repo
col index

# 4. Preview what context would be sent for a task
col plan --domain auth "add refresh token support"

# 5. Export a Codex-ready context package
col export --domain auth "add refresh token support"
# → col-context-20260413T120000Z.md
```

Attach the generated `.md` to your AI agent. Done.

---

## 🔄 How It Works

```
Your Task
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                       COL                           │
│                                                     │
│  ┌──────────┐   ┌──────────┐   ┌───────────────┐   │
│  │ Planner  │──▶│Retriever │──▶│   Governor    │   │
│  │          │   │          │   │               │   │
│  │ keywords │   │ fragments│   │ trim excerpts │   │
│  │ domains  │   │ windows  │   │ dedup content │   │
│  │ budget   │   │ scoring  │   │ apply limits  │   │
│  └──────────┘   └──────────┘   └───────────────┘   │
│       │               │               │             │
│       ▼               ▼               ▼             │
│  ┌─────────────────────────────────────────────┐   │
│  │                   Cache                     │   │
│  │     mtime/size invalidation · TTL · dedup   │   │
│  └─────────────────────────────────────────────┘   │
│                        │                            │
└────────────────────────┼────────────────────────────┘
                         │
                         ▼
              col-context-{ts}.md
              ┌──────────────────┐
              │ ## TASK          │
              │ ## AGENT RULES   │
              │ ## BUDGET        │
              │ ## CONTEXT       │
              │   src/api/auth   │
              │   src/features/  │
              │ ## METRICS       │
              └──────────────────┘
                         │
                         ▼
                    AI Agent 🤖
                 (starts working,
                  no exploration)
```

### The AGENTS.md Integration

COL reads your `AGENTS.md` and classifies rules by section severity:

| Section keyword | Classification | Effect on budget |
|---|---|---|
| `## Never`, `## Prohibido`, `## Critical` | `critical` | Reduces `maxFiles` to minimum |
| `## Rules`, `## Reglas`, `## Work` | `standard` | Included in context package |
| Everything else | `info` | Included, no budget effect |

---

## 📖 CLI Reference

| Command | Description |
|---|---|
| `col init` | Create `col.config.json` and directory structure |
| `col index` | Build lightweight repo index (cached) |
| `col plan <task>` | Preview: keywords, candidates, token estimate |
| `col pack <task>` | Generate context package (stdout) |
| `col export <task>` | Generate context `.md` file for agent attachment |
| `col govern <kind>` | Trim tool output: `search` · `diff` · `log` |
| `col stats` | Show cumulative savings metrics |
| `col status` | Operational summary (ready, cache state, savings) |
| `col doctor` | Diagnostic: config, agents, index, cache |
| `col clear-cache` | Clear index and/or pack cache |

### Flags

| Flag | Commands | Description |
|---|---|---|
| `--domain <name>` | `plan`, `pack`, `export` | Force a declared domain for scoring |
| `--json` | All commands | Machine-readable output |
| `--file <path>` | `govern` | Read input from file instead of stdin |
| `--index` | `clear-cache` | Clear only index cache |
| `--pack` | `clear-cache` | Clear only pack cache |

### Examples

```bash
# Preview before committing to a pack
col plan "migrate notifications to new schema"
col plan --domain notifications "migrate notifications to new schema"

# Export context for agent
col export --domain auth "block access if pulse_access_status is pending"

# Trim a large grep result
rg "sendNotification" src/ | col govern search

# Trim a git diff before sending to agent
git diff | col govern diff

# Check savings over time
col stats

# Full project diagnostic
col doctor --json
```

---

## ⚙️ Configuration

COL is configured via `col.config.json` in your project root.

```json
{
  "entrypoints": ["src/App.tsx", "src/api/index.ts"],
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/coverage/**"
  ],
  "maxFiles": 5,
  "maxLinesPerFile": 120,
  "maxTotalLines": 300,
  "matchWindow": 20,
  "packCacheTtlMs": 3600000,
  "domainMappings": [...],
  "domainRules": [...],
  "toolLimits": {
    "searchMatches": 8,
    "diffFiles": 6,
    "logLines": 80
  }
}
```

### Configuration Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `entrypoints` | `string[]` | `[]` | High-priority files. Score boosted by +5 |
| `ignore` | `string[]` | `["node_modules/**"...]` | Glob patterns excluded from indexing |
| `maxFiles` | `number` | `5` | Max files in a context package |
| `maxLinesPerFile` | `number` | `120` | Max lines extracted per file |
| `maxTotalLines` | `number` | `240` | Hard cap on total lines across all fragments |
| `matchWindow` | `number` | `20` | Lines of context above/below each keyword match |
| `packCacheTtlMs` | `number` | `3600000` | Pack cache TTL in ms (default: 1 hour) |
| `domainMappings` | `DomainMapping[]` | `[]` | Explicit domain → path declarations |
| `domainRules` | `DomainRule[]` | `[]` | Tag/path-based score boosters |
| `toolLimits.searchMatches` | `number` | `8` | Max lines from `col govern search` |
| `toolLimits.diffFiles` | `number` | `6` | Max files from `col govern diff` |
| `toolLimits.logLines` | `number` | `80` | Max lines from `col govern log` |

### Domain Mappings

Domain mappings are the most powerful feature. They let you declare the topology of your project so COL can route tasks to the right files without guessing.

```json
"domainMappings": [
  {
    "name": "auth",
    "aliases": ["auth", "authentication", "login", "session", "token", "sso"],
    "paths": [
      "src/features/auth/",
      "src/api/auth.ts",
      "src/core/hooks/useAuth.ts"
    ],
    "tags": ["auth", "login", "session"],
    "boost": 20
  },
  {
    "name": "payments",
    "aliases": ["payment", "billing", "invoice", "stripe"],
    "paths": ["src/features/payments/", "src/api/payments.ts"],
    "tags": ["payment", "stripe"],
    "boost": 18
  },
  {
    "name": "notifications",
    "aliases": ["notification", "push", "toast", "alert"],
    "paths": ["src/features/notifications/"],
    "tags": ["notification"],
    "boost": 18
  }
]
```

When you run `col plan --domain auth "add refresh token"`, every file inside `src/features/auth/`, `src/api/auth.ts`, and `src/core/hooks/useAuth.ts` gets a +20 score boost — making them appear at the top regardless of filename.

---

## 🤖 AGENTS.md — Reading Gate

Add this section to your `AGENTS.md` to make COL a mandatory first step for any AI agent working on your repo:

```markdown
## Reading Gate — REQUIRED

Before reading any file, run:

```bash
col pack --domain <domain> "<task description>"
```

Available domains: `auth`, `payments`, `notifications`, `support`, `api`

Rules:
- Work ONLY with the files returned by the pack
- Do not `cat` or `grep` additional files unless the pack returns 0 fragments
- If `estimatedTokens` exceeds 8000, add a more specific `--domain` or reduce `maxFiles`
```

COL detects the `## Reading Gate`, `## Never`, and `## Critical` sections and applies them automatically to budget decisions.

---

## 📊 Token Savings

Real-world estimates for a mid-size React + Supabase project (~50 files, 15k total lines):

| Scenario | Without COL | With COL | Saved |
|---|---|---|---|
| Auth task, domain known | ~7,600 tokens | ~600 tokens | **92%** |
| Refactor task, broad scope | ~12,000 tokens | ~2,400 tokens | **80%** |
| Bug fix, single feature | ~4,800 tokens | ~800 tokens | **83%** |
| Schema migration | ~9,200 tokens | ~1,600 tokens | **83%** |

> **Note:** savings depend heavily on how well `domainMappings` are configured for your project. A well-tuned config consistently achieves 75–90% reduction.

### Real session output

```
col export --domain auth "block dashboard access if pulse_access_status is pending"

[pack]
totalFiles=2
sourceLines=393
totalLines=105
savedLines=288
savedPercent=73%
estimatedTokens=558
estimatedCost=~$0.0017 USD
cacheHit=false

exported col-context-20260413T120000Z.md
```

---

## 📁 Project Structure

```
col/
├── src/
│   ├── cli/           # CLI entrypoint and command definitions
│   ├── config/        # Config loader and AGENTS.md parser
│   ├── indexer/       # Repo indexer (heuristic scoring)
│   ├── planner/       # Task → keyword extraction → candidate scoring
│   ├── retriever/     # Fragment extraction and budget enforcement
│   ├── governor/      # Tool output trimming + token estimation
│   ├── cache/         # Index and pack cache with mtime/TTL invalidation
│   └── types/         # Shared TypeScript interfaces
├── extension/         # VS Code extension (beta)
│   └── src/
│       ├── cli/       # Extension ↔ CLI bridge
│       └── webview/   # Sidebar panel UI
├── docs/              # Architecture and implementation docs
├── col.config.json    # COL's own config (dogfooded)
└── AGENTS.md          # Agent rules (read by COL itself)
```

---

## 🧩 VS Code Extension *(beta)*

The extension provides a sidebar panel that wraps the CLI with a UI:

- **Status header** — ready state, index cache, pack cache, savings %
- **Task composer** — input field + Plan / Pack / Export actions
- **Fragment viewer** — browse selected files and excerpts
- **Metrics** — cumulative token savings over time

The extension delegates all logic to the CLI via `--json` output. No duplicate logic.

> The extension is in early beta. Install from source by opening `extension/` in VS Code and running **Run Extension** from the debug panel.

---

## 🏗️ Architecture Decisions

**Why no embeddings in v1?**
Embeddings add latency, cost, and a dependency on an external service. Path heuristics + domain mappings cover 90% of real-world use cases with zero infrastructure. Embeddings are planned for v2 as an opt-in.

**Why a local CLI instead of a daemon?**
A CLI is auditable, composable, and works in any environment — CI, remote SSH, Windows PowerShell, Docker containers. A daemon adds complexity with no benefit for the primary use case.

**Why JSONL/JSON cache instead of SQLite?**
Fewer dependencies, easier to inspect, easy to delete. The cache is small (last 20 packs). SQLite is planned when query patterns justify it.

**Why TypeScript over Rust/Go?**
Faster iteration, native JSON handling, direct path to VS Code extension integration, and most AI-assisted devs already have Node available.

---

## 🗺️ Roadmap

### v0.2 — Current

- [x] `init`, `index`, `plan`, `pack`, `export`, `govern`, `stats`, `doctor`, `status`
- [x] Domain mappings with explicit path → boost
- [x] AGENTS.md parser with section severity classification
- [x] Token estimator with cost preview
- [x] Pack cache with mtime/size + TTL invalidation
- [x] Auto-govern fragments inside pack pipeline
- [x] Codex export `.md` format
- [x] VS Code extension scaffold

### v0.3 — Next

- [ ] `col init --detect` — auto-detect entrypoints and suggest domain mappings
- [ ] `col watch` — background reindex on file changes
- [ ] `--clipboard` flag for `export` — pipe to clipboard directly
- [ ] AGENTS.md rule-to-policy converter (emit violations as warnings)
- [ ] Per-slice savings report

### v0.4 — Future

- [ ] Optional embeddings via `sqlite-vss` (local, no API required)
- [ ] Multi-repo support
- [ ] Observability panel (savings over time, most accessed domains)
- [ ] GitHub Action for CI token budget enforcement

---

## 🤝 Contributing

Contributions are welcome. COL is intentionally minimal — read the architecture decisions above before proposing new dependencies.

```bash
# Clone and install
git clone https://github.com/Tuwebai/col.git
cd col
npm install

# Build
npm run build

# Type check without emitting
npm run check

# Run against itself (dogfood)
col index
col plan "add a new feature to the planner"
```

**Before opening a PR:**
- Run `npm run check` — zero TypeScript errors required
- No `any` types
- New commands must support `--json` output
- New config fields must be backward compatible (default = current behavior)

---

## 📄 License

MIT © [TuWebAI](https://tuweb-ai.com)

---

<div align="center">

Built to make AI agents faster, cheaper, and more predictable.

**[tuweb-ai.com](https://tuweb-ai.com)** · [@tuwebai](https://github.com/Tuwebai)

</div>
