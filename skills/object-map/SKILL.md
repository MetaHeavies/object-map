---
name: object-map
description: Create and maintain a repository’s shared product object map while building software with an agent. Use to initialize a new product from a brief or PRD, map an existing implementation, understand mapped concepts, or reconcile the map after product changes and builder edits.
---

# Object Map

Maintain a product model that a builder can inspect days later to see what exists, understand how it fits together, notice omissions and express what should be added. The builder need not know OOUX. The agent maintains the artifact during product work; manual canvas editing is an additional way to communicate intent.

`.object-map/map.json` is the shared product model. Code is evidence of implemented behavior; the brief, conversation and builder edits express intent. Neither automatically cancels the other. An object such as Pizza may be deliberately added before any Pizza code exists.

## Install or open

If `.object-map/map.json` is absent, run this skill’s `scripts/install.mjs /absolute/repository/path`. This prepares the model, repository instructions, skill locations and host hook configuration. It does not invent a model. Then follow [discovery.md](references/discovery.md) to populate it.

The default installer configures Claude Code and Codex. `--hosts=claude` or `--hosts=codex` limits host configuration. It preserves unrelated instructions/settings and existing map data. If older or customized skill files conflict, `--upgrade` preserves backups before replacing them. See [hosts.md](references/hosts.md) for activation, limitations and verification.

When a problem with Object Map itself is being reported, the builder installs with `--dev`. When prompt context says development feedback is enabled, read [feedback.md](references/feedback.md) and record actual mapping problems, builder corrections or integration difficulties as they occur. Automatic diagnostics remain local; export only when the builder asks. `--no-dev` stops recording without uninstalling the integration.

Run from the target repository:

```sh
node .agents/skills/object-map/scripts/map.mjs doctor
node .agents/skills/object-map/scripts/serve.mjs
```

To show a builder what the map's parts mean before their own is populated, `scripts/serve.mjs --demo` opens a small worked example with a walkthrough of the vocabulary. It is served from a temporary copy and touches no repository.

The portable skill includes the built canvas; Node 20+ is required. Open the URL printed by the server. Never carry object names, vocabulary or an expected model from another repository into this one. The map describes this product only.

## At every user turn

1. Read the current map, or use the current prompt-hook snapshot plus `scripts/context.mjs` for the relevant objects. A previous conversation summary is not a fresh map. Hook indexes marked as partial require a full or targeted read.
2. Identify the objects, attributes, relationship roles, actions and states implicated by the user’s request. Preserve the builder’s names and IDs. Inspect evidence and implementation before claiming that behavior exists.
3. If the builder added or described a new concept, incorporate that intention in the task. Do not discard it because it lacks a table, route or implementation.
4. Carry out the requested work. Maintain the relevant map entries alongside authorized product changes; routine, evidence-supported map maintenance does not require a separate permission question. Discussion-only turns do not authorize unrelated implementation.
5. Before finishing, compare the affected concepts with the actual resulting code and the user’s intent. Add supported concepts and changed behavior, preserve unimplemented intentions, and leave genuine ambiguities as questions. Do not fabricate a map edit merely to satisfy a hook.
6. Validate and save any semantic edits with the revision-checked writer described below. Record the review using the token supplied by the current prompt hook, including a concrete note when no map change was necessary. Mention meaningful product-model changes or unresolved gaps briefly in the handoff.

If hooks are unavailable, follow the same read/work/reconcile loop through AGENTS.md or CLAUDE.md. Do not claim a runtime guarantee in that case.

## Choose the workflow

- **New repository or PRD:** Read [discovery.md](references/discovery.md), section “New product.” Populate explicit product intentions before or alongside implementation, then mark evidence-supported behavior as observed.
- **Existing repository / “run Object Map”:** Read all of [discovery.md](references/discovery.md). Inspect the actual stack, trace product concepts across implementation surfaces, and populate the artifact. Do not stop at a list of candidates or require the builder to manually recreate your findings.
- **Ongoing product work:** Read [maintenance.md](references/maintenance.md). Reconcile only affected concepts, preserving builder edits and unresolved intentions.
- **Reference or canvas handoff:** `node .agents/skills/object-map/scripts/context.mjs obj:place` resolves a stable object or item ID and its immediate network. IDs are examples; use this repository’s actual IDs.

## Read, edit, validate, write

Read [format.md](references/format.md) before creating or structurally changing a map. These commands operate on the current repository even when called from a subdirectory:

```sh
node .agents/skills/object-map/scripts/map.mjs read
```

The response contains `data` and `revision`. Create a candidate JSON file containing the edited **data document**, not that response envelope. Start from the fresh document and preserve unknown fields. Put scratch candidates in a temporary directory or `.object-map/runtime/`.

```sh
node .agents/skills/object-map/scripts/map.mjs validate /path/to/candidate.json
node .agents/skills/object-map/scripts/map.mjs write /path/to/candidate.json --revision REVISION_FROM_READ
```

After writing, read the map back the way the builder will:

```sh
node .agents/skills/object-map/scripts/map.mjs check
```

It names the objects worth a second look: one that connects to nothing, one nobody can act on, a missing definition, a relationship label that only repeats its target, a claim with no evidence. It also prints the unresolved questions from `.object-map/discovery.md`, so write those as you go: they are what the builder reads first. Resolve or explain each flag before reporting the run finished. An object flagged twice is usually an attribute or implementation machinery that should not have become an object.

The writer validates the complete model, uses a shared file lock and atomically replaces the model only if the revision still matches. On a conflict, reread, reconcile the builder’s edits and retry once. If it conflicts again, keep the candidate and report the concurrent edit instead of repeatedly overwriting. Never bypass this by directly redirecting output into map.json.

When the current prompt supplies a review token, use that exact token after inspecting the result:

```sh
node .agents/skills/object-map/scripts/map.mjs review TOKEN "Added Place booking URL from the implemented form; retained the intended Contact object."
```

This receipt records your review and the current map revision. It is not proof that a conceptual interpretation is correct. Never fabricate a receipt for an unperformed review.

`.object-map/layout.json` belongs to canvas positioning and view state; semantic maintenance must not modify it. Never rebuild the map from scratch over an existing model. Preserve IDs through renames and promotions, and preserve builder additions through refreshes.
