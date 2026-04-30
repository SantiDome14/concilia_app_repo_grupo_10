# product-management-framework

Ardua's Product Management operating framework — principles, protocols, and the living knowledge base that guides how we discover problems, design solutions, and ship products.

---

## What this repository is

This is the **shared operating system of the Product area at Ardua**. Every Product Manager works against the same principles, protocols, and knowledge base. The repository is intentionally a Git repository (not a wiki, not Notion, not a folder in Drive) for three reasons:

1. **Versioning** — every change is traced to an author, a timestamp, and a diff. We can always see _what_ changed, _when_, and _by whom_.
2. **Single source of truth** — GitHub is canonical. Local clones are working copies.
3. **Code-friendly** — prototypes are project folders (with `package.json`, `src/`, etc.). A Git repository is the natural home for both markdown and code.

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
├── discovery/                ← Investigation of hypotheses (flat folder)
├── features/                 ← Source of truth of product state
│   ├── [aplicacion]/         ←   One folder per product
│   └── common/               ←   Transversal features (cross-product)
├── prototypes/               ← Visual representation of products (1:1 with features/)
│   └── [aplicacion]/         ←   Project folder per product
├── skills/                   ← Packaged Claude Skills used across the area
└── workflows/                ← n8n workflow exports for the Miles Slack agent
```

### `framework/`

Foundational constraints within which every product must be designed: legal structure of the group, operational model, accounting framework, mission, vision, values, and the canonical [`project-instructions.md`](framework/project-instructions.md). These documents function as a **mandatory filter** — every design decision must validate against them.

Files here are gated by `CODEOWNERS`: changes require Head of Product approval via Pull Request. They are updated only when the underlying reality they describe changes (regulatory modifications, new intercompany contracts, structural changes to the group).

### `entities/`

Catalog of the operational ecosystem: own entities (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures), providers (Binance, Bitso, Bridge), banks (Brubank, Bind, etc.), and partners (Convera, etc.).

Each file describes **what the entity enables us to do operationally** — which capabilities it unlocks, under which conditions, with which limits. Consulted whenever an entity is mentioned during a session.

### The Discovery–Features–Prototypes triad

These three folders form the **core production loop** of the framework. They reflect the natural flow of how products are created and updated:

> **Investigate → Define → Prototype**
>
> First we investigate (discovery). From the investigation, definitions land (features). Those definitions give rise to prototypes — or to modifications of existing prototypes.

#### `discovery/`

Investigation of hypotheses. Flat folder — every discovery file lives directly under `discovery/`. A single discovery can impact one or many features; a single feature can receive contributions from one or many discoveries. The relation is **N-N**.

A discovery is **not** a snapshot of a product's current state — that lives in `features/`. A discovery captures what was being investigated and what was learned. When a hypothesis matures, its conclusions are propagated to the affected feature file(s).

#### `features/`

The **single source of truth** for the current, documented state of every product in Ardua's portfolio. When you want to know what a product looks like today and what it's expected to do, the answer lives here.

One folder per product. Inside each folder, a `README.md` captures the global state of the product (purpose, modules, current state, key decisions), and individual feature files (`[aplicacion]-[modulo-o-feature].md`) capture the consolidated specification of each capability.

A special `features/common/` folder groups **transversal features** — capabilities that span two or more products with the same semantics (e.g., unified notifications, alerts, inboxes). Files inside `common/` drop the application prefix since the folder already provides the context.

#### `prototypes/`

Functional, navigable representation of each product, used as an alignment and validation tool with stakeholders before construction. **1:1 correspondence** with `features/` at the product level: `features/clp/` ↔ `prototypes/clp/`. Each prototype represents the entire product, not individual features.

### `skills/`

Packaged Claude Skills used across the area. Currently includes:

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
- **Discovery → Features propagation** — when a hypothesis matures, its conclusions must be propagated to the affected feature file(s) in `features/`. A learning that doesn't update `features/` is a leak.
- **Conventional Commits** with scope (e.g., `feat(clp): ...`, `docs(framework): ...`).

Full detail in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Primary references

| Document | Purpose |
|---|---|
| [`framework/project-instructions.md`](framework/project-instructions.md) | _What_ the framework is and how the system operates |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | _How_ we collaborate around the repository |
| [`CODEOWNERS`](CODEOWNERS) | Approval gates per path |
