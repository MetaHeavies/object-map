# Object Map

A repository-installed skill and shared OOUX canvas for builders using coding agents. The agent populates and maintains the product model alongside implementation; the builder inspects it, spots omissions and adds intentions directly. Objects appear as parallel columns; attributes, relationships, actions and optional states are stacked beneath each object with restrained semantic color coding.

## Run

Requires Node 22.12+.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. An existing Atlas map loads automatically. If you lose your place, choose **Atlas → Show saved map** or press **F** to fit it; a saved viewport with the entire map offscreen recovers on opening. The first run generates Atlas in `examples/atlas`, installs the Object Map skill there, and opens candidate discovery. Review the candidates and add the objects you want. Generation never includes a precomputed conceptual map.

To run the separate Atlas application:

```sh
npm run atlas
```

Open **http://127.0.0.1:4318**. Atlas uses Node alone and persists its working data in `examples/atlas/database/data.json`.

## Work with the map

- Object columns open by default. Each header carries a one-line definition of what the object is in the product; double-click it to edit, or leave it empty rather than filling it with a restatement of the name. A collapsed column shows its group counts instead. Click an object header to select it. Click an attribute, action or state to select its card. Double-click any inline text or press F2 while its label is focused to edit it. Enter saves; Escape cancels.
- One `+` at the bottom of each object opens a chooser for Attribute, Relationship, CTA, or State. The new row is inserted into its matching group; states can be added even when the optional states display is off.
- Drag an object heading to reorder the aligned columns. A placeholder previews the drop position; Escape cancels. Column gutters are 32px and all row gaps are 4px at 100% zoom. Visual ordering is saved separately from the semantic model.
- Hover or keyboard-focus an attribute to reveal **Promote to object**. The new column appears beside its parent and the original attribute becomes a relationship, whose editor opens straight away: the attribute's name is only a placeholder, since it repeats the new object's name and says nothing about how the two relate.
- Selecting an object keeps its own structure visible and highlights its immediate relationships in both directions. Irrelevant groups collapse through a reversible zero-height grid transition; all headers retain their positions. Click the canvas, Clear selection, or Escape to restore the full model.
- Every occurrence of the selected object stays visible inside its containing column, including multiple roles such as Person as both Owned by and Shared with. Focus reveals matching rows even in manually collapsed columns; clearing focus restores those columns' previous collapse state.
- Click a relationship label to select its card; double-click or press F2 to rename it. Its link control follows the target object. Relationship roles lead, with the target object always shown second. Roles are predicates reading source to target, so “Owned by Person” and “Shared with Person” distinguish two links to the same object; a role that merely repeats its target is visible as such. The canvas moves only when needed to reveal an offscreen header. Use the relationship's pencil control to edit its name or target; selection never opens the editor automatically.
- Semantic colors are amber for attributes, blue for relationships, green for actions and lilac for optional states. Reduced-motion and keyboard selection respond immediately.
- Drag the blank area of an object header to move its column. Drag the canvas to pan; scroll or pinch to zoom around the pointer. There is no separate pan tool. Double-click blank canvas to zoom in; Shift-double-click to zoom out.
- Undo/redo semantic changes with the toolbar or Cmd/Ctrl-Z and Shift-Cmd/Ctrl-Z. A promoted object can also be demoted from its menu if it has no added structure or additional inbound relationships.
- Copy stable references from an item's controls or an object's menu. **Session changes** provides a compact agent handoff and an export of the model.
- Canvas settings group display switches (optional states, implementation evidence) and three motion prototypes. Reduced-motion settings take priority.
- Keyboard shortcuts: **N** creates an object, **F** fits the model, **Cmd/Ctrl-K** finds an object, **Escape** dismisses panels.

Saves go to the selected repository's `.object-map/map.json` and `.object-map/layout.json` independently. Semantic identifiers survive renaming. Stale revisions are rejected instead of overwriting a newer file. If a save fails, export your unsaved work before reloading.

## Another repository

```sh
npm run install:map -- /absolute/path/to/repository
OBJECT_MAP_REPO=/absolute/path/to/repository npm run dev
```

Installation creates empty map/layout/config files, the portable skill under `.agents/skills/object-map` and `.claude/skills/object-map`, marked instructions in `AGENTS.md` and `CLAUDE.md`, and host-specific hooks in `.codex/hooks.json` and `.claude/settings.json`. Existing maps, unrelated instructions and settings are preserved. Use `--hosts=codex` or `--hosts=claude` to limit host configuration. Older/customized skill files require `--upgrade`, which backs them up.

Tell the agent **“Run Object Map on this repository”** to inspect the implementation and populate the map. For a new product, it starts from the brief or PRD and maintains the model while building. “New object” is the builder’s direct way to express an additional concept, such as Pizza, before implementation exists.

The built-in discovery adapter combines **SQL CREATE TABLE schemas and JSON page metadata**; it is deliberately bounded. It reports schema-only candidates separately and never imports candidates silently. For other stacks, the installed skill guides the agent to inspect routes, forms, schemas and services and propose a model for human review. General multi-stack automated extraction is future work.

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

## Field testing and development feedback

Use a branch of an existing product for the first trial. From this source checkout, build the portable skill and install it with local feedback enabled:

```sh
npm run package:skill
npm run install:map -- /absolute/path/to/product --hosts=codex --dev
```

Use `--hosts=claude` when testing Claude Code. The installer prints the skill build fingerprint. Restart/trust the host, run `map.mjs doctor`, then ask the agent to run Object Map on the product and use it through ordinary tasks. Follow [the field-test guide](TESTING.md) for the complete loop.

`--dev` records local hook, review and write diagnostics plus structured findings the agent or builder explicitly adds. Logs stay in git-ignored `.object-map/dev/`. There is no automatic upload. Automatic diagnostics exclude product code, prompts, object labels, paths and review text; authored feedback notes contain supplied text.

From the product repo:

```sh
node .agents/skills/object-map/scripts/map.mjs feedback export > /tmp/object-map-feedback.json
```

Review that report before sharing it here or in a GitHub issue. Add `--metrics-only` to omit qualitative notes. Reinstall with `--upgrade --dev` for a new build, or `--no-dev` to stop recording. See [feedback details](skills/object-map/references/feedback.md).

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

This is a working local prototype: semantic editing, promotion/demotion, undo/redo, contextual relationships, repository persistence, candidate review, handoff, a deployable agent skill, and the Atlas fixture generator are implemented. Motion treatments are interactive prototypes awaiting human evaluation; they are not a claim that the final motion design has been selected. Agent-led discovery/maintenance, portable packaging, prompt/session hooks, bounded end-of-turn review checks and live canvas refresh are implemented. Fully automatic semantic drift detection, generic deterministic parsers for arbitrary stacks and velocity-based drag inertia are not implemented. Native Windows and live host session activation still require validation on the recipient’s setup. There are no accounts, cloud storage or automatic code generation.

The original intent and scope are in [PRD.md](PRD.md) and [PROJECT.md](PROJECT.md). The current design follows the user's traditional OOUX column reference, with subtle color coding and collapsing focus context added through interactive review.
