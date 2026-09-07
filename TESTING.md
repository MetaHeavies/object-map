# Test Object Map in an existing product

Keep the Object Map source in its own repository. Install a packaged build into a branch of a real product repository so changes to instructions, hooks and the product model can be reviewed independently of normal development. Use one host first; Claude Code and Codex have separate activation checks.

## Prepare the build

From the Object Map source checkout:

```sh
npm ci
npm test
npm run package:skill
```

The output is `dist/object-map-skill.tgz`. The build contains the canvas and needs only Node 22.12+ in the target product. The installer reports a fingerprint of the skill’s contents; feedback records that fingerprint.

## Install in the product

Commit or otherwise preserve existing product work before making a test branch. Extract the bundle to a temporary location, then install the extracted skill into the product:

```sh
git switch -c test/object-map
node /path/to/extracted/object-map/scripts/install.mjs /path/to/product --hosts=claude --dev
```

Use `--hosts=codex` when testing Codex. Inspect the diff, then restart/trust the host as needed. From the product root:

```sh
node .agents/skills/object-map/scripts/map.mjs doctor
node .agents/skills/object-map/scripts/serve.mjs
```

Tell the agent: “Run Object Map on this existing product. Inspect the implementation, populate the map, and record real problems you encounter through development feedback.”

## Exercise the workflow

1. Check the initial map: meaningful objects, correct relationships, sensible attributes/actions/states, and no unearned claims about behavior.
2. Correct a name or boundary. See whether the agent preserves the correction in subsequent work.
3. Add an intended object and describe it without implementing it. Verify it survives discovery and maintenance.
4. Ask for a small real product change. Verify the agent updates the affected concept and the open canvas refreshes.
5. Edit the canvas during agent work. Verify a newer edit is merged or a conflict is reported, rather than silently overwritten.
6. Start a fresh conversation. Verify it receives current map context and records a review. Inspect dev logs if activation is uncertain.
7. Note whether the extra work is useful or intrusive. Record concrete failures and successful behaviors you want to retain.

Use normal product tasks for this test. Dev mode collects diagnostics and asks the agent to record actual difficulties; it does not make a separate evaluation pass on every turn.

## Return feedback

```sh
node .agents/skills/object-map/scripts/map.mjs feedback export > /tmp/object-map-feedback.json
```

Review the notes, then bring the report back to the Object Map project with your observations. Use `--metrics-only` to omit qualitative text. There is no automatic upload. The report never automatically includes product source or conversation transcripts; supplied feedback text may still describe your product.

When a new build is ready, reinstall from that extracted build with `--upgrade --dev`. Existing map/layout and unrelated host settings are preserved; customized skill files are backed up. Use `--no-dev` to stop recording. To end the whole trial, review and revert the installation changes on the test branch; `--no-dev` does not uninstall hooks.

## Source validation

```sh
npm test
npm run test:browser
npm run package:skill
npm run test:portable
```

The browser test needs Chromium (`npx playwright install chromium`, or set CHROMIUM_EXECUTABLE). The portable test extracts the actual bundle, installs it into an isolated repository and starts its bundled server. Host-shaped hook tests are automated; activation inside real host sessions is part of the field test.
