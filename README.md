# Object Map

A shared product model your coding agent maintains while it builds.

Install it into a repository and the agent reads the implementation — routes, forms, schemas, services, tests — and writes down what the product is actually made of: the things a user can name, what belongs to each one, how they connect, what can be done to them, and the states they move through. You open a canvas and read the result as parallel columns, correct it, and add the concepts that only exist in your head so far. It is [OOUX](https://alistapart.com/article/object-oriented-ux/) kept current by the agent instead of workshopped once and abandoned.

![The Bookshelf demo: five object columns — Book, Author, Member, Loan, Hold — with colour-coded attributes, relationships, actions and states](docs/canvas.png)

## Install

Requires **Node 22.12 or newer** and a repository you want mapped.

```sh
curl -L https://github.com/MetaHeavies/object-map/releases/latest/download/object-map-skill.tgz | tar xz
node object-map/scripts/install.mjs /absolute/path/to/your/repository
```

Restart or trust your agent host so the project hooks activate, then open the canvas:

```sh
cd /absolute/path/to/your/repository
node .agents/skills/object-map/scripts/serve.mjs
```

Give the agent this:

> Run Object Map on this repository. Inspect the implementation, populate the map, and tell me what you were unsure about.

For a product that does not exist yet, point it at the brief instead — the map holds intentions and implementation side by side, and marks which is which.

### What it needs, and what it doesn't

Node is the tool's own runtime, the way git is: **your product can be written in anything.** Python, Ruby, Go, PHP, TypeScript — Object Map reads the implementation, it never runs it. There is no clone, no `npm install`, no build step and no dependency added to your project.

There is no Python build of the installer, hooks or viewer, and a static server such as `python3 -m http.server` cannot host the canvas: it reads and writes `.object-map/*.json` through a small local API, all of it on 127.0.0.1.

Hosts: **Claude Code** and **Codex** are configured automatically. Use `--hosts=claude` or `--hosts=codex` for one instead of both. Any other agent falls back to the repository instructions, which are plain Markdown and work anywhere.

### What installation writes

| Path | What it is |
| --- | --- |
| `.object-map/` | The model, the layout and local config |
| `.agents/skills/object-map/` | The portable skill: instructions, references, Node helpers, canvas |
| `.claude/skills/object-map/` | The same skill where Claude Code looks for it |
| `AGENTS.md`, `CLAUDE.md` | A marked block of instructions, appended |
| `.claude/settings.json`, `.codex/hooks.json` | Session, prompt and end-of-turn hooks |

Existing instructions, settings and maps are preserved. `--upgrade` replaces older or customized skill files and keeps backups. To remove Object Map, delete the three directories, the marked blocks and the Object Map entries in the hook files.

## Try it without installing

```sh
node .agents/skills/object-map/scripts/serve.mjs --demo
```

Opens **Bookshelf**, a small library product built to show what the parts mean rather than to be realistic. A walkthrough explains the vocabulary: what an object is, what belongs to it as an attribute, why a relationship carries a name, how the same object can appear twice under two roles, and why one concept on the map has no code behind it yet. The demo is copied to a temporary directory before it is served, so exploring it never edits anything.

From a source checkout, `npm run demo` does the same.

## Reading the map

Each column is one object. Beneath it, in order: amber attributes, blue relationships, green actions, lilac states. Colour is the only decoration — everything else is structure.

- **A one-line definition** under each object name says what it is in this product. Empty is better than a restatement of the name.
- **Relationship labels are predicates**, read source to target: *Written by Author*, *Translated by Author*. Two links to the same object stay distinguishable. A label that merely repeats its target is visible as a label that says nothing.
- **`many`** means the source holds more than one, so that link needs a list to add to and remove from where a single one needs a picker. **`filter`** marks a field the product actually lets people sort or search by. Together they are the shape of every browse screen you have not built yet.
- **Objects with no code behind them** stay on the map, marked, until they are built or dropped — nothing quietly disappears between conversations.
- Look for the object that carries everything and the ones that carry nothing, one concept sitting in two places under two names, an action with nowhere to happen. Those are the questions worth taking back to the agent.

## Working on it

- Click an object header to select it. Everything outside its context leaves the canvas and the remaining columns gather around the one you acted in, which holds its place. Click blank canvas or press Escape to bring them back.
- Double-click any label, or press F2 while it is focused, to rename it. Enter saves, Escape cancels. Semantic identifiers survive renaming.
- `+` at the foot of a column adds an attribute, relationship, CTA or state. **New object** is how you put a concept on the map before any code exists.
- **Promote to object** turns an attribute into its own column and leaves a relationship behind — then asks you to name it, because the attribute's own name only repeats the target.
- Deleting an object, promoting and demoting are confirmed first, and the confirmation names what the change takes with it.
- Undo and redo with Cmd/Ctrl-Z and Shift-Cmd/Ctrl-Z. **F** fits the map, **Cmd/Ctrl-K** finds an object, **Escape** dismisses panels.
- Settings holds the repository paths, a saved-map recovery, an export, and the session log with a copyable summary for your agent.

Edits save to `.object-map/map.json` and `.object-map/layout.json` independently. Stale revisions are rejected rather than overwriting a newer file, so you and the agent can both be working. The canvas polls for external changes, defers them during an active edit, and keeps your view when only the semantics moved.

## Staying current

The install writes three hooks so the model does not rot:

- **SessionStart** and **UserPromptSubmit** put the current map in front of the agent, so it works from the model rather than rediscovering it.
- **Stop** compares what moved this turn: if the implementation changed and the map did not, it names the files and asks for a reconciliation, at most once.

Hooks keep the map in the conversation. They cannot prove it is semantically right — that is what your reading of the canvas is for. `node .agents/skills/object-map/scripts/map.mjs doctor` checks the installation; a fresh prompt confirms activation.

Resolve a single reference from the repository:

```sh
node .agents/skills/object-map/scripts/context.mjs obj:place
```

## Development

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Opens **http://127.0.0.1:5173**. The first run generates the Atlas fixture in `examples/atlas` and installs the skill there. Atlas is a deliberately mixed-quality product for testing discovery; it never ships with a precomputed map. `npm run atlas` runs the fixture's own application on **http://127.0.0.1:4318**.

Install a development build into another repository:

```sh
npm run package:skill
node scripts/install.mjs /absolute/path/to/repository
```

`package:skill` builds the canvas into `dist/object-map-skill.tgz`. Installing straight from a clone without it gives the agent integration but no viewer, since build output is not committed.

`--dev` records local hook, review and write diagnostics under git-ignored `.object-map/dev/`, which is only useful when reporting a problem with Object Map itself. See [feedback details](skills/object-map/references/feedback.md).

### Fixtures

```sh
npm run generate -- /tmp/atlas-realistic --condition realistic --seed 42
node generator/scenario.mjs /tmp/atlas-realistic drift
```

Conditions are `clean`, `realistic` and `messy`; a fixed condition and seed give identical starting data, and each destination must be new. Generated projects are standalone with no npm dependencies. The scenarios (`drift`, `opening-hours`, `companions`) change the implementation after mapping so divergence can be tested; they leave Object Map untouched. Expectations live in `evaluation/atlas.json` and are never copied into generated repositories.

### Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run package:skill
npm run test:portable
```

Browser tests generate an isolated repository and start their own servers on ports 5176 and 4319, so they never touch your development map. Set `CHROMIUM_EXECUTABLE` to reuse an existing Chromium. Screenshots land in `test-results/`.

## Current boundary

This is a working beta. Implemented: agent-led discovery and maintenance, semantic editing, promotion and demotion, undo/redo, contextual focus, repository persistence with revision checks, the portable skill, prompt and session hooks, bounded end-of-turn review, live canvas refresh and the fixture generator.

Not implemented: fully automatic semantic drift detection, generic deterministic parsers for arbitrary stacks, and inertial dragging. Native Windows and live host activation still need validating on your setup. There are no accounts, no cloud storage and no code generation.

Deliberately absent: a built-in schema extractor. A schema reader only sees schema-backed products, it cannot tell a product object from a table, and having one in the canvas implied the map could populate itself. Mapping is the agent's job.

Original intent and scope: [PRD.md](PRD.md), [PROJECT.md](PROJECT.md), and the open questions behind them in [PRODUCT-QUESTIONS.md](PRODUCT-QUESTIONS.md). Host compatibility: [host integration](skills/object-map/references/hosts.md). The maintenance contract the agent follows: [the skill](skills/object-map/SKILL.md).

## Licence

MIT. See [LICENSE](LICENSE).
