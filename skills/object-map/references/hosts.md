# Host integration and portability

The portable unit is a directory with SKILL.md, references, Node helpers and a built canvas. The skill language is shared; lifecycle configuration is host-specific. Installation creates one canonical `.object-map/map.json`, even though host-discoverable skill copies may exist in two places.

| Host | Skill entry | Persistent instructions | Lifecycle configuration |
| --- | --- | --- | --- |
| Codex | `.agents/skills/object-map/SKILL.md` | `AGENTS.md` | `.codex/hooks.json` |
| Claude Code | `.claude/skills/object-map/SKILL.md` | `CLAUDE.md` | `.claude/settings.json` |
| Other agents | Read the same SKILL.md and scripts | Host-supported repository instructions | Requires a verified host adapter; none is implied |

The installer adds its own marked instruction blocks and hook handlers, preserving unrelated content. It detects modified skill files; explicit `--upgrade` keeps backups. It never resets an existing model or layout. It does not edit global user configuration, enable unrelated permissions or bypass workspace trust. `--no-hooks` installs instructions without adding hook handlers; it does not remove previously configured hooks.

## Lifecycle

- SessionStart supplies current product context, including after resume/compaction when the host fires this event.
- UserPromptSubmit reads the latest map and supplies a unique review token. Small maps are injected as JSON; large maps provide a bounded index with an explicit instruction to read the relevant full context.
- Stop checks whether that turn has a review receipt matching the latest map revision. A missing/stale receipt triggers one continuation request. Already-continued stops and repeated reminders pass through to prevent loops.

Hooks do not parse application code or maintain the model themselves. They ensure context is supplied and check a recorded review. Semantic extraction and maintenance are the agent’s responsibility under SKILL.md. A receipt is not proof that the agent understood the product correctly. Disabled hooks, unsupported hosts and policy restrictions reduce this to an instruction-driven workflow.

## Activate and verify

1. Use Node 22.12+ on the host’s PATH. Install into a repository path you can write. Project hooks execute local code, so the host must trust/allow the repository configuration.
2. Restart the agent session after installation if the host has not loaded the new configuration. Check the host’s hook listing or diagnostics. The local development machine has Codex CLI 0.153.4 with hooks reported stable/enabled; that does not establish the configuration of a recipient’s host.
3. Run `node .agents/skills/object-map/scripts/map.mjs doctor` from the repository root. It checks file presence and model validity, not host activation.
4. Submit a fresh prompt. Verify that Object Map context includes the current map revision and a review token. Complete a task, reconcile the model and record a review with that token. Verify the next prompt sees the resulting revision.
5. If the hook does not run, inspect host diagnostics, project trust, settings and Node availability. Do not add invented hook fields or claim AGENTS.md guarantees execution. Follow the manual loop while reporting the limitation.

The hook command locates the installed skill by walking parent directories, so it works in a new non-git repository and from a nested working directory. Hook data and receipts live under ignored `.object-map/runtime/`; model data stays in the tracked map. Native Windows command execution has not been exercised here; test host activation before claiming support there.

## Portable installation

The source project’s `npm run package:skill` produces `dist/object-map-skill.tgz`. Extract its `object-map` directory into `.agents/skills/` or another temporary location, then run that folder’s `scripts/install.mjs /path/to/product`. A folder initially placed under `.claude/skills/` can run the same installer. Run `scripts/serve.mjs` from the product repository to serve its own model with the bundled canvas. No React/Vite install is needed in that product repository.

Repackage after changing the UI; development source files are not the portable canvas. Use `--upgrade` to migrate older installations with backups. This is a local distribution artifact, not a published package registry or marketplace release.

## Official references checked September 7, 2026

- [Codex skills](https://developers.openai.com/codex/skills): skill entry points and discovery.
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md): persistent repository instructions.
- [Codex hooks](https://developers.openai.com/codex/hooks): prompt/session context injection and Stop responses.
- [Claude Code skills](https://code.claude.com/docs/en/skills): project skill discovery.
- [Claude Code hooks](https://code.claude.com/docs/en/hooks): project configuration and lifecycle events.

The host adapter uses command hooks and structured JSON output supported by these references. A shared SKILL.md does not make every host’s configuration format interchangeable.
