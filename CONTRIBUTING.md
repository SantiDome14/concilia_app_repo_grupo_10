# Contributing to `atlas-ai-product-management-framework`

This document captures the conventions and contribution flow for working on this repository. **It complements `framework/project-instructions.md`** — that document defines _what_ the framework is and how the system thinks; this one defines _how_ we collaborate around the repo.

If you are a Product Manager onboarding into the team, read `framework/project-instructions.md` first. Then come back here.

---

## 1. Working flow

The repository is the **shared operating system** of the Product area. Every PM works against a local clone; the system (Claude) reads and writes to the local filesystem, and you persist changes to GitHub via Git.

### 1.1 Session lifecycle

1. **Pull at the start of every session.**

   ```bash
   cd /path/to/atlas-ai-product-management-framework
   git pull
   ```

   Other PMs may have pushed changes since your last session.

2. **Work with the system.** The system loads context from the relevant folders (per `project-instructions.md` §11.1), proposes changes, and writes to the filesystem only after you confirm.

3. **Commit and push at the end of the session.** The system will provide a ready-to-execute Git command block. Review, then run.

   ```bash
   git add -A
   git status --short
   git commit -m "<conventional commit message>"
   git push
   ```

4. **Until you push, the local filesystem and GitHub are out of sync.** GitHub is the single source of truth. Other PMs cannot see your work until it lands on `main`.

### 1.2 Resolving conflicts

If you `git pull` and have unpushed local changes, Git may report a conflict. Resolve it like any other Git workflow: stash, rebase, or merge depending on the situation. If you are unfamiliar with Git conflict resolution, ask the Head of Product before forcing anything.

---

## 2. Naming conventions

These rules apply to **every file in the repository** and are non-negotiable. The system enforces them when generating new files.

### 2.1 General rules

- **kebab-case only** — words separated by hyphens (`-`), never underscores (`_`).
- **ASCII only** — no accents, no `ñ`, no special characters. Allowed character set: `[a-z0-9-]`.
- **No version suffixes** — Git handles versioning. The `v[N]` pattern is reserved for **real conceptual forks** (pivots, major redirections, redefined scope). Minor iterations are committed in place with descriptive commit messages.

### 2.2 Naming patterns by folder

| Folder | Pattern | Example |
|---|---|---|
| `framework/` | `[topic].md` | `marco-legal.md`, `mision-vision.md` |
| `entities/` | `[entity-name].md` | `haz-pagos.md`, `ardua-solutions-corp.md` |
| `discoveries/` | See §5.4 of `framework/project-instructions.md` for the full 7-category table (Product umbrella/module/functionality/transversal feature, Cross-core architecture, Internal infrastructure, Process/tooling) | `clp-discovery.md`, `lex-alertas-discovery.md`, `fin-reporteria-pnl-discovery.md`, `core-modulos-transversales-discovery.md`, `observabilidad-discovery.md`, `jira-sla-discovery.md` |
| `features/[aplicacion]/` | `README.md` (global state) | `features/clp/README.md` |
|  | `[aplicacion]-[modulo-o-feature].md` | `features/clp/clp-rfq.md`, `features/trd/trd-proveedores-de-liquidez.md` |
| `features/common/` | `README.md` (global state of transversal features) | `features/common/README.md` |
|  | `[capacidad].md` (no app prefix — folder defines context) | `features/common/notificaciones.md`, `features/common/alertas.md` |
| `prototypes/[aplicacion]/` | Project folder per product | `prototypes/clp/` (with `package.json`, `src/`, `README.md`) |
| `skills/` | `[skill-name]/SKILL.md` | `ardua-req-definition/SKILL.md` |
| `workflows/` | `[descriptive-name].json` | `miles-conversation-handler.json` |

### 2.3 Discovery–Features–Prototypes relationships

The three folders are tightly coupled:

- **Discovery → Features:** N-N. A discovery can impact one or many features. A feature can receive contributions from one or many discoveries.
- **Features → Prototypes:** 1-1 at the product level. Each `features/[aplicacion]/` folder has a counterpart `prototypes/[aplicacion]/` folder. **Exception:** `features/common/` does NOT have a counterpart in `prototypes/` — transversal features are reflected inside the prototype of each product that implements them.

The system enforces these relationships when proposing changes.

### 2.4 Discovery `features` field syntax

The `features` array in a discovery's YAML frontmatter has four valid forms:

| Case | Syntax | Example |
|---|---|---|
| Hypothesis scoped to one or more financial-core products | `[APP1]`, `[APP1, APP2]` | `[CLP]`, `[LEX, FIN]` |
| Hypothesis on a **transversal feature** (cross-product, lives in `features/common/`) | `[COMMON]` | `[COMMON]` for a hypothesis on the unified notifications system |
| Hypothesis on **cross-core architecture** (questions how core apps relate to each other) | `[CORE]` | `[CORE]` for `core-modulos-transversales-discovery.md` |
| Hypothesis on **internal infrastructure** or **process/tooling** (no feature folder) | `[]` (empty array) | `[]` for `jira-automations-discovery.md`, `observabilidad-discovery.md`, `jira-sla-discovery.md` |

The `COMMON` token is reserved for transversal features only; the `[CORE]` token is for cross-core architecture. Do not use either for internal infrastructure or process/tooling — those use empty array `[]`.

---

## 3. Discovery lifecycle

Discoveries are **investigations of hypotheses**. They are not snapshots of product state — that lives in `features/`. A discovery captures what was being investigated and what was learned.

### 3.1 Standardized file structure

Every discovery file has two parts:

- **YAML frontmatter** with metadata: `name`, `features`, `status`, `owner`, `created_at`, `updated_at`, `propagates_to`. See `framework/project-instructions.md` §11.3 for the full specification of each field.
- **Body** starting with `# Heading` matching `name`, followed by two mandatory sections (`## Objetivo`, `## Contexto`). The rest of the body is free-form.

The full specification with field semantics and template lives in `discoveries/README.md`.

### 3.2 Lifecycle

1. **Created** when a new hypothesis or area of investigation is opened. Header populated with `status: En investigación` and body skeleton (Objetivo + Contexto) filled at first save or shortly after.
2. **Iterated** while the hypothesis is being validated. Multiple sessions may add findings, refine the question, or branch into related hypotheses. Each iteration updates `updated_at`.
3. **Concluded** when the hypothesis is validated, discarded, or sufficiently defined. At conclusion, the system **must propagate** the relevant findings to the affected feature file(s) in `features/`.

A discovery file is **not deleted at conclusion**. It stays in `discoveries/` as a historical record. The `status` field reflects its current state:

- `En investigación` — hypothesis is being actively tested.
- `Concluida` — findings have been incorporated into the relevant feature file(s).
- `Descartada` — the hypothesis was rejected. The discovery stays as a record of why.

### 3.3 Critical propagation rule

When a hypothesis is concluded, the system must always propose **propagating the conclusion to the destination(s) declared in `propagates_to:`** — which may include `features/`, `framework/`, `entities/`, `workflows/`, or `skills/`, depending on the nature of the conclusion. A validated learning that doesn't propagate to its declared destination(s) is a leak.

If a single discovery propagates to multiple destinations, the propagation step must update every affected file.

---

## 4. Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/).

### 4.1 Format

```
<type>(<scope>): <subject>

[optional body]
```

### 4.2 Types

| Type | When to use |
|---|---|
| `feat` | A new feature spec, a new entity file, a new prototype, a new skill |
| `fix` | Correction to existing content (typos, factual errors, broken links) |
| `chore` | Repository maintenance (renames, structure changes, gitignore) |
| `docs` | Documentation-only changes (README, CONTRIBUTING, project-instructions) |
| `refactor` | Reorganization of existing content without changing meaning |

### 4.3 Scopes

Use the affected core application or area as the scope. Examples:

- `feat(clp): add Earn FCI sub-feature spec`
- `docs(framework): update marco-contable to reflect new ARS regulation`
- `chore(repo): standardize prototype filenames to kebab-case`
- `refactor(discoveries): split lex-discovery into per-feature investigations`
- `feat(workflows): add Miles slash command handler`

If the change is repository-wide, use `repo` as the scope.

---

## 5. Pull Requests

Most changes can be committed directly to `main`. The exception is changes to **gated paths** (see `CODEOWNERS`):

- `/framework/` — requires Head of Product approval
- `/README.md`, `/CODEOWNERS`, `/CONTRIBUTING.md`, `/.gitignore` — require Head of Product approval

For gated paths:

1. Create a feature branch:

   ```bash
   git checkout -b docs/framework-update-[short-description]
   ```

2. Commit and push:

   ```bash
   git add -A
   git commit -m "docs(framework): <subject>"
   git push -u origin docs/framework-update-[short-description]
   ```

3. Open a Pull Request on GitHub. The CODEOWNERS rule automatically requests review from the Head of Product.

4. Once approved, merge into `main`.

---

## 6. What to do when something is unclear

- If a folder is missing a file you expect (e.g. an entity is mentioned in a session but `entities/[name].md` does not exist), **flag it and propose creating it**. Do not silently work without context.
- If a naming convention does not seem to fit a new file you need to create, **propose an extension to this document** rather than inventing a new pattern in isolation.
- If `framework/` documents seem out of sync with reality (e.g. a new bank, a new license, a regulatory change), **flag it to the Head of Product** — do not edit `framework/` directly.
- If a discovery's findings don't seem to map cleanly to an existing feature file, **propose creating a new feature file** rather than dumping the findings into the global `features/[aplicacion]/README.md`.

---

## 7. Reference documents

- `framework/project-instructions.md` — the canonical operating framework. Read this first.
- `README.md` — repository overview and onboarding.
- `CODEOWNERS` — approval gates per path.
