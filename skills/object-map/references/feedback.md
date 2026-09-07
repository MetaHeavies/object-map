# Development feedback

The installer’s `--dev` flag enables local diagnostics and agent-authored feedback for a field test. It changes neither product implementation nor discovery confidence. Normal installations do not record diagnostics. Reinstalling without a mode flag preserves the current setting; `--no-dev` turns recording off and retains existing reports.

In dev mode, collect useful feedback as part of real work. Record a finding when the builder corrects a conceptual mapping, an instruction is ambiguous, a hook fails, the canvas behaves incorrectly, or installation/maintenance produces a reproducible problem. Successful product work does not require a new feedback note each turn. Do not invent findings or treat disagreement as proof that the builder is wrong.

From the product repository root:

```sh
node .agents/skills/object-map/scripts/map.mjs feedback mapping "Sharing was mistaken for access control" --expected "Represent the stored recipients without claiming authorization" --actual "The first interpretation claimed enforced permissions" --steps "Inspect sharing persistence, then trace authorization checks"
```

Categories: `mapping`, `workflow`, `hooks`, `canvas`, `installation`, `other`. The summary is required; expected behavior, actual behavior and reproduction steps are optional. Describe Object Map’s behavior and the correction. Do not paste source files, credentials, full conversations or personal records into notes. Do not automatically send issues or reports to any remote service.

Automatic diagnostics record hook event/outcome/timing, review completion, map/layout write outcomes, conflicts and object/item counts. They include a fingerprint of the installed skill files so feedback can be associated with the exact build. Automatic fields are allowlisted: no prompt bodies, object labels, source code, repository paths, error messages or review-note text are copied. A hook event proves the command ran; it does not prove the agent understood its context.

Logs live in `.object-map/dev/`, which installation excludes from git. Logging failures never fail a product-model save or block a hook. Agent-authored feedback notes do contain the supplied text; review an export before sharing it.

```sh
node .agents/skills/object-map/scripts/map.mjs feedback export > /tmp/object-map-feedback.json
node .agents/skills/object-map/scripts/map.mjs feedback export --metrics-only > /tmp/object-map-metrics.json
```

The export contains current installation/build information, environment version, counters and up to the latest 2,000 events and 100 feedback notes. `coverage.truncated` identifies a partial window; counters describe that window, not an all-time success rate. The metrics-only export omits note content. Existing local logs remain available after `--no-dev`. No network submission is implemented.

For an installation problem that prevents this helper from running, record the problem in your test notes and bring it back to the Object Map project. Dev mode cannot diagnose a hook that never starts by itself; verify activation with a fresh prompt and check whether any UserPromptSubmit event was recorded.
