# Object Map

A repository-installed skill and shared OOUX canvas for builders using coding agents. The agent populates and maintains the product model alongside implementation; the builder inspects it, spots omissions and adds intentions directly. Objects appear as parallel columns; attributes, relationships, actions and optional states are stacked beneath each object with restrained semantic color coding.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. An existing Atlas map loads automatically. If you lose your place, choose **Atlas → Show saved map** or press **F** to fit it; a saved viewport with the entire map offscreen recovers on opening. The first run generates Atlas in `examples/atlas` and installs the Object Map skill there. Generation never includes a precomputed conceptual map; an agent populates it.

To run the separate Atlas application:

```sh
npm run atlas
```

Open **http://127.0.0.1:4318**. Atlas uses Node alone and persists its working data in `examples/atlas/database/data.json`.

## See it first

```sh
npm run demo
```

Opens **Bookshelf** on http://127.0.0.1:5174 — a small library product built to show what the parts mean rather than to be realistic. A walkthrough runs on first open: what an object is, what belongs to it as an attribute, why a relationship carries a name, how the same object appears twice under two roles, and why one concept on the map has no code behind it yet. It explains the vocabulary, not the controls; the agent does the maintaining.

The demo is copied to a temporary directory before it is served, so exploring it never edits anything. From an installed skill:

```sh
node .agents/skills/object-map/scripts/serve.mjs --demo
```

## Work with the map

- Object columns open by default. Each header carries a one-line definition of what the object is in the product; double-click it to edit, or leave it empty rather than filling it with a restatement of the name. Collapse a column from its options menu to park it while you work elsewhere; a collapsed column shows its group counts instead. Click an object header to select it. Click an attribute, action or state to select its card. Double-click any inline text or press F2 while its label is focused to edit it. Enter saves; Escape cancels.
- One `+` at the bottom of each object opens a chooser for Attribute, Relationship, CTA, or State. The new row is inserted into its matching group; states can be added even when the optional states display is off.
- Drag an object heading to reorder the aligned columns. A placeholder previews the drop position; Escape cancels. Column gutters are 32px and all row gaps are 4px at 100% zoom. Visual ordering is saved separately from the semantic model.
- Hover or keyboard-focus an attribute to reveal **Promote to object**. The new column appears beside its parent and the original attribute becomes a relationship, whose editor opens straight away: the attribute's name is only a placeholder, since it repeats the new object's name and says nothing about how the two relate.
- Selecting an object keeps its own structure visible and highlights its immediate relationships in both directions. Objects outside that context leave the canvas rather than fading to grey, and the ones that remain gather around the column you acted in, which holds its place — following a link keeps the column you followed it from still and brings the target to it. Irrelevant groups collapse through a reversible zero-height grid transition, and the add control appears only under the column you selected; clearing the selection returns every column to where it was. Click the canvas, Clear selection, or Escape to restore the full model.
- Every occurrence of the selected object stays visible inside its containing column, including multiple roles such as Person as both Owned by and Shared with. Focus reveals matching rows even in manually collapsed columns; clearing focus restores those columns' previous collapse state.
- Click a relationship label to select its card; double-click or press F2 to rename it. Its link control follows the target object. Relationship roles lead, with the target object always shown second. Roles are predicates reading source to target, so “Owned by Person” and “Shared with Person” distinguish two links to the same object; a role that merely repeats its target is visible as such. The canvas moves only when needed to reveal an offscreen header. Use the relationship's pencil control to edit its name or target; selection never opens the editor automatically.
- A relationship holding more than one is marked `many`, and an attribute the product lets people sort or filter by is marked `filter`. Both are read from the implementation and both decide what has to be built: many needs a list to add to and remove from where one needs a picker, and the filter marks are the shape of every browse screen.
- Semantic colors are amber for attributes, blue for relationships, green for actions and lilac for optional states. Every colour is OKLCH: one lightness ramp at four hues, so a row's label is a darker tone of the row itself rather than a neutral grey laid over it. Dark mode reads the same ramp from the other end, and every label keeps its family's hue. Reduced-motion and keyboard selection respond immediately.
- Drag the blank area of an object header to move its column. Drag the canvas to pan; scroll or pinch to zoom around the pointer. There is no separate pan tool. Double-click blank canvas to zoom in; Shift-double-click to zoom out.
- Deleting an object, promoting an attribute and demoting back are confirmed first, naming what the change takes with it — a delete lists the links into the object that go too. Enter accepts, Escape cancels.
- Undo/redo semantic changes with the toolbar or Cmd/Ctrl-Z and Shift-Cmd/Ctrl-Z. A promoted object can also be demoted from its menu if it has no added structure or additional inbound relationships.
- Copy stable references from an item's controls or an object's menu. The session log in settings provides a compact agent handoff and an export of the model.
- One panel holds everything that is not the map: repository paths, show saved map, export, display switches, appearance, motion and the session log. The header carries the product name, the repository you are in, and the control that opens it. The motion choice sets the duration and easing for both the scripted animations and the canvas transitions, so focus and collapse follow it too. The appearance choice is remembered in this browser. Reduced-motion settings take priority.
- Finding sits centred under the bar and opens in place: the control becomes the field, focused, with matches beneath it. A light/dark toggle mirrors it on the other side at the same height.
- Keyboard shortcuts: **F** fits the model, **Cmd/Ctrl-K** finds an object, **Escape** dismisses panels.

Saves go to the selected repository's `.object-map/map.json` and `.object-map/layout.json` independently. Semantic identifiers survive renaming. Stale revisions are rejected instead of overwriting a newer file. If a save fails, export your unsaved work before reloading.

## Another repository

```sh
npm run install:map -- /absolute/path/to/repository
OBJECT_MAP_REPO=/absolute/path/to/repository npm run dev
```

Installation creates empty map/layout/config files, the portable skill under `.agents/skills/object-map` and `.claude/skills/object-map`, marked instructions in `AGENTS.md` and `CLAUDE.md`, and host-specific hooks in `.codex/hooks.json` and `.claude/settings.json`. Existing maps, unrelated instructions and settings are preserved. Use `--hosts=codex` or `--hosts=claude` to limit host configuration. Older/customized skill files require `--upgrade`, which backs them up.

Tell the agent **“Run Object Map on this repository”** to inspect the implementation and populate the map. For a new product, it starts from the brief or PRD and maintains the model while building. “New object” is the builder’s direct way to express an additional concept, such as Pizza, before implementation exists.

Mapping is the agent's job. The installed skill guides it to inspect routes, forms, schemas, services and tests, and to propose a model for human review. There is no built-in extractor: a schema reader only sees schema-backed products, it cannot tell a product object from a table, and having one in the canvas implied the map could populate itself.

Resolve a reference from the target repository:

```sh
node .agents/skills/object-map/scripts/context.mjs obj:place
```

Supported hosts receive fresh context through SessionStart and UserPromptSubmit command hooks. A Stop hook checks for a review receipt matching the current map revision, with at most one reminder. Hooks do not prove semantic correctness. Restart/trust the host as needed; `map.mjs doctor` checks installation files, while a fresh prompt verifies activation. Other hosts fall back to repository instructions until an adapter is implemented.

The canvas checks for external model changes every two seconds and on window focus. It defers updates during an active edit or save, preserves the view when only semantics change, and clears stale undo history after accepting an external model revision. A conflicting save remains an explicit error; it never overwrites a newer agent or builder edit.

## Distribute the skill

```sh
npm run package:skill
```

This produces `dist/object-map-skill.tgz`, containing the skill, references, Node helpers and built canvas. Extract it, then run:

```sh
node /path/to/object-map/scripts/install.mjs /path/to/product
cd /path/to/product
node .agents/skills/object-map/scripts/map.mjs doctor
node .agents/skills/object-map/scripts/serve.mjs
```

The product repo needs Node 22.12+, but no Vite/React installation. This is a local portable bundle, not a published marketplace release. See [host integration](skills/object-map/references/hosts.md) for compatibility and activation, and [the skill](skills/object-map/SKILL.md) for the maintenance contract.

## Install into a product

Requires Node 22.12+ in the target repository. Nothing else — no clone, no npm install, no build.

```sh
curl -L https://github.com/MetaHeavies/object-map/releases/latest/download/object-map-skill.tgz | tar xz
node object-map/scripts/install.mjs /absolute/path/to/your/repository
```

The installer prints the build fingerprint, the command to open the canvas, and the prompt to give the agent. Restart or trust the host so the project hooks activate, then:

```sh
cd /absolute/path/to/your/repository
node .agents/skills/object-map/scripts/serve.mjs
```

> Run Object Map on this repository. Inspect the implementation, populate the map, and tell me what you were unsure about.

Installation writes the skill to `.agents/skills/object-map` and `.claude/skills/object-map`, a marked block in `AGENTS.md` and `CLAUDE.md`, host hooks in `.claude/settings.json` and `.codex/hooks.json`, and empty model files under `.object-map/`. Existing instructions, settings and maps are preserved. `--hosts=claude` or `--hosts=codex` configures one host instead of both; `--upgrade` replaces older or customized skill files, keeping backups.

To remove it, delete `.agents/skills/object-map`, `.claude/skills/object-map`, `.object-map/`, the marked blocks, and the Object Map entries in the host hook files.

### From a source checkout

```sh
npm install
npm run package:skill
node scripts/install.mjs /absolute/path/to/your/repository
```

The canvas is build output and is not committed, so installing straight from a clone gives the agent integration without the viewer; `package:skill` builds it first.

`--dev` records local hook, review and write diagnostics under git-ignored `.object-map/dev/`, which is only useful when reporting a problem with Object Map itself. See [feedback details](skills/object-map/references/feedback.md).

## Repeatable Atlas fixtures

```sh
npm run generate -- /tmp/atlas-clean --condition clean --seed 42
npm run generate -- /tmp/atlas-realistic --condition realistic --seed 42
npm run generate -- /tmp/atlas-messy --condition messy --seed 42
```

Each destination must be new. Generated projects are standalone and have no npm dependencies. A fixed condition and seed give identical starting data. The realistic fixture includes 24 places, 6 collections, 12 visits, 6 people, 36 notes, 32 photo records, 12 cities and 16 tags. Schema/UI naming varies, and technical entities are deliberately mixed with product concepts.

Apply implementation changes after mapping to test divergence:

```sh
node generator/scenario.mjs /tmp/atlas-realistic drift
node generator/scenario.mjs /tmp/atlas-realistic opening-hours
node generator/scenario.mjs /tmp/atlas-realistic companions
```

`drift` adds booking URL, price level and Contact. `opening-hours` migrates the string into structured related records. `companions` adds a many-person Visit relationship. These commands change the disposable implementation, including working data if present, and leave Object Map untouched. Restart Atlas afterwards. Test expectations live separately in `evaluation/atlas.json` and are never copied into generated repositories.

## Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run package:skill
npm run test:portable
```

Browser tests generate an isolated repository and start their own servers on ports 5176 and 4319. They do not edit your development map. Set `CHROMIUM_EXECUTABLE` to use an existing Chromium binary. Screenshots are written to `test-results/`.

For a built local server, run `npm run build` then `npm start` (after preparing/installing the target repository).

## Current boundary

This is a working local prototype: semantic editing, promotion/demotion, undo/redo, contextual relationships, repository persistence, handoff, a deployable agent skill, and the Atlas fixture generator are implemented. Motion treatments are interactive prototypes awaiting human evaluation; they are not a claim that the final motion design has been selected. Agent-led discovery/maintenance, portable packaging, prompt/session hooks, bounded end-of-turn review checks and live canvas refresh are implemented. Fully automatic semantic drift detection, generic deterministic parsers for arbitrary stacks and velocity-based drag inertia are not implemented. Native Windows and live host session activation still require validation on the recipient’s setup. There are no accounts, cloud storage or automatic code generation.

The original intent and scope are in [PRD.md](PRD.md) and [PROJECT.md](PROJECT.md). The current design follows the user's traditional OOUX column reference, with subtle color coding and collapsing focus context added through interactive review.
