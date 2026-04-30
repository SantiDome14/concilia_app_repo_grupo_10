# Contributing to `product-management-framework`

This document captures the conventions and contribution flow for working on this repository. **It complements `framework/project-instructions.md`** — that document defines _what_ the framework is and how the system thinks; this one defines _how_ we collaborate around the repo.

If you are a Product Manager onboarding into the team, read `framework/project-instructions.md` first. Then come back here.

---

## 1. Working flow

The repository is the **shared operating system** of the Product area. Every PM works against a local clone; the system (Claude) reads and writes to the local filesystem, and you persist changes to GitHub via Git.

### 1.1 Session lifecycle

1. **Pull at the start of every session.**

   ```bash
   cd /path/to/product-management-framework
   git pull
   ```

   Other PMs may have pushed changes since your last session.

2. **Work with the system.** The system loads context from the relevant folders (per `project-instructions.md` §10.1), proposes changes, and writes to the filesystem only after you confirm.

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
| `discovery/active/` | `[aplicacion]-discovery.md` | `clp-discovery.md` |
|  | `[aplicacion]-[modulo]-discovery.md` | `lex-limites-discovery.md` |
|  | `[product]-discovery.md` (transversal) | `prime-desk-rfq-gateway-discovery.md` |
| `discovery/archived/` | Same patterns as `active/` | (see above) |
| `features/` | `[aplicacion]-[feature].md` | `com-pipeline-comercial.md` |
|  | `[product].md` (transversal) | `prime-desk-rfq-gateway.md` |
| `prototypes/[aplicacion]/` | `[aplicacion]-[name]-prototype.html` (single-file) | `clp-rfq-prototype.html` |
|  | `[aplicacion]-[name]-prototype/` (project folder) | `fin-tesoreria-prototype/` |
| `skills/` | `[skill-name]/SKILL.md` | `ardua-req-definition/SKILL.md` |
| `workflows/` | `[descriptive-name].json` | `miles-conversation-handler.json` |

### 2.3 Discovery ↔ Feature alignment

When a discovery is archived and produces a feature spec, the discovery filename **must match** the feature filename plus the `-discovery` suffix.

- `features/prime-desk-rfq-gateway.md` ↔ `discovery/archived/prime-desk-rfq-gateway-discovery.md`
- `features/com-pipeline-comercial.md` ↔ `discovery/archived/com-pipeline-comercial-discovery.md`

This guarantees traceability between the validation process and the consolidated definition.

---

## 3. Discovery lifecycle

Discoveries are **living documents** that capture hypotheses under validation, open questions, decisions, and active blockers. They follow a simple lifecycle:

```
[create]  →  discovery/active/[name]-discovery.md
                     │
                     │  iterate while hypotheses are open
                     │
                     ▼
[mature]  →  generate features/[name].md
                     +
             move to discovery/archived/[name]-discovery.md
                     +
             register closure metadata in the document header
```

### 3.1 When a discovery is mature

A discovery is mature when **all hypotheses, open questions, and pending decisions** in the document are resolved (validated, discarded, or defined). At that point the system will propose:

1. Generating or updating the corresponding `features/[aplicacion]-[feature].md`.
2. Moving the discovery from `active/` to `archived/`.
3. Registering in the archived document's header:
   - Archive date
   - Derived feature filename
   - 2–3 line summary of key decisions that survived

If open hypotheses remain, the discovery stays in `active/` and updates happen in place.

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
- `refactor(discovery): align rfq-prime-desk filename with feature spec`
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

---

## 7. Reference documents

- `framework/project-instructions.md` — the canonical operating framework. Read this first.
- `README.md` — repository overview and onboarding.
- `CODEOWNERS` — approval gates per path.
