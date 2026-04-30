# product-management-framework

Ardua's Product Management operating framework — principles, protocols, and the living knowledge base that guides how we discover problems, design solutions, and ship products.

---

## What this repository is

This is the **shared operating system of the Product area at Ardua**. Every Product Manager works against the same principles, protocols, and knowledge base. The repository is intentionally a Git repository (not a wiki, not Notion, not a folder in Drive) for three reasons:

1. **Versioning** — every change is traced to an author, a timestamp, and a diff. We can always see _what_ changed, _when_, and _by whom_.
2. **Single source of truth** — GitHub is canonical. Local clones are working copies.
3. **Code-friendly** — prototypes are increasingly project folders (with `package.json`, `src/`, etc.). A Git repository is the natural home for both markdown and code.

The **canonical reference** for how this framework operates is [`framework/project-instructions.md`](framework/project-instructions.md). Read it first.

---

## Repository structure

```
product-management-framework/
├── README.md                 ← You are here
├── CODEOWNERS                ← Approval gates (framework/ reserved to Head of Product)
├── CONTRIBUTING.md           ← Conventions, naming rules, contribution flow
├── .gitignore                ← OS, editor, and project artifacts excluded from versioning
│
├── framework/                ← Foundational constraints (gated by CODEOWNERS)
├── entities/                 ← Catalog of the operational ecosystem
├── discovery/
│   ├── active/               ← Discoveries currently under validation
│   └── archived/             ← Discoveries whose validation has concluded
├── features/                 ← Feature/product specifications
├── prototypes/               ← Functional prototypes per core application
├── skills/                   ← Packaged Claude Skills used across the area
└── workflows/                ← n8n workflow exports for the Miles Slack agent
```

### `framework/`

Foundational constraints within which every product must be designed: legal structure of the group, operational model, accounting framework, mission, vision, values, and the canonical [`project-instructions.md`](framework/project-instructions.md). These documents function as a **mandatory filter** — every design decision must validate against them.

Files here are gated by `CODEOWNERS`: changes require Head of Product approval via Pull Request. They are updated only when the underlying reality they describe changes (regulatory modifications, new intercompany contracts, structural changes to the group).

### `entities/`

Catalog of the operational ecosystem: own entities (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures), providers (Binance, Bitso, Bridge), banks (Brubank, Bind, etc.), and partners (Convera, etc.).

Each file describes **what the entity enables us to do operationally** — which capabilities it unlocks, under which conditions, with which limits. Consulted whenever an entity is mentioned during a session.

### `discovery/active/`

Discoveries currently under validation. **Living documents** that capture hypotheses being tested, open questions, decisions made along the way, and active blockers. Reading them is what guarantees continuity between sessions.

### `discovery/archived/`

Discoveries whose validation process has concluded. The consolidated definition lives in `features/`; what lives here is the **historical record** of how each feature was defined — which hypotheses were validated, which were discarded, and which decisions survived.

### `features/`

Feature/product specifications. **Single source of truth for "what we are building"** — these are the consolidated outputs of archived discoveries (SRS, PRDs, functional specs).

### `prototypes/`

Functional prototypes per core application. Two supported modalities:

- **Single-file** (`.html`) — for quick validations.
- **Project folder** (with `package.json`, `src/`, etc.) — for prototypes whose scope justifies a real frontend project. Each project folder must include its own `README.md`.

Prototypes are alignment and validation tools, not design or development deliverables.

### `skills/`

Packaged [Claude Skills](https://docs.claude.com/en/docs/claude-code/skills) used across the area. Currently includes:

- `ardua-req-definition` — captures product requirements
- `ardua-req-enrichment` — enriches captured requirements with context
- `ardua-process-documentation` — documents operational processes into Notion

### `workflows/`

n8n workflow exports for the Miles Slack agent (the area's requirement-capture bot). Consulted only when implementing changes to those workflows.

---

## Getting started (for PMs)

### First-time setup

1. **Clone the repository** to a local path of your choice.

   ```bash
   git clone git@github.com:a1yr/product-management-framework.git
   cd product-management-framework
   ```

2. **Read the canonical reference**: [`framework/project-instructions.md`](framework/project-instructions.md). This is _the_ document that defines how the framework operates.

3. **Skim the rest of `framework/`** to internalize the foundational constraints (legal, operational, accounting, mission/vision/values).

4. **Read [`CONTRIBUTING.md`](CONTRIBUTING.md)** for naming conventions, commit message format, and the Pull Request flow for gated paths.

### Daily workflow

1. **Pull at the start of every session.**

   ```bash
   git pull
   ```

2. **Work with the system.** The system loads context from the relevant folders, proposes changes, and writes to the filesystem only after you confirm.

3. **Commit and push at the end.** The system will provide a ready-to-execute Git command block.

   ```bash
   git add -A
   git commit -m "<conventional commit message>"
   git push
   ```

GitHub is the single source of truth. Until you push, your work is invisible to the rest of the team.

---

## Governance

Most changes can be committed directly to `main`. Changes to **gated paths** require approval from the Head of Product via Pull Request:

- `framework/` — foundational constraints
- `README.md`, `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore` — repository governance

See [`CODEOWNERS`](CODEOWNERS) for the exact rules and [`CONTRIBUTING.md`](CONTRIBUTING.md) for the PR flow.

---

## Conventions at a glance

- **kebab-case** for all filenames. ASCII only (no accents, no `ñ`).
- **No version suffixes** — Git handles versioning. The `v[N]` pattern is reserved for real conceptual forks.
- **Discovery ↔ Feature alignment** — when a discovery is archived, its filename must match the feature spec filename plus the `-discovery` suffix.
- **Conventional Commits** with scope (e.g., `feat(clp): ...`, `docs(framework): ...`).

Full detail in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Primary references

| Document | Purpose |
|---|---|
| [`framework/project-instructions.md`](framework/project-instructions.md) | _What_ the framework is and how the system operates |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | _How_ we collaborate around the repository |
| [`CODEOWNERS`](CODEOWNERS) | Approval gates per path |
