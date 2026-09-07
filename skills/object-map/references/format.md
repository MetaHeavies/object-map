# Model format and identity

Canonical file: `.object-map/map.json`. Version 1 remains compatible with maps created before provenance was recorded.

```json
{
  "version": 1,
  "objects": [
    {
      "id": "obj:pizza",
      "name": "Pizza",
      "description": "A pizza the customer can configure and order.",
      "status": "intended",
      "attributes": [{"id": "obj:pizza/attr:size", "name": "Size", "status": "intended"}],
      "relationships": [],
      "actions": [{"id": "obj:pizza/action:order", "name": "Order", "status": "intended"}],
      "states": [],
      "evidence": ["PRD.md"]
    }
  ]
}
```

All four section arrays are required even when empty. IDs are globally unique. Object IDs begin with `obj:`; the conventional item prefixes are `/attr:`, `/rel:`, `/action:` and `/state:`. Relationship entries also require `target`, an existing object ID. Create targets before relationships. Names must be nonempty strings. Preserve IDs when names change; suffix new colliding IDs rather than reusing one. A relationship label expresses its source-side role, while `target` identifies the referenced object.

Optional `status` on an object or item is `intended`, `observed`, or `mixed`. Missing status means not yet assessed, not observed. Mixed means implemented and intended parts coexist; use item statuses for the distinction. `evidence` is an array of repository-relative paths. A PRD path supports intent, while implementation paths support observed behavior. Do not claim that a path alone proves every property of an object.

The UI currently edits meaning and preserves this metadata; it does not yet provide a complete intended/observed comparison view. Do not promise that distinction is visually presented everywhere.

The validator checks structure, IDs and relationship targets. Humans and agents must still judge whether the concepts are correct. Keep extraction scope, aliases and unresolved questions in `.object-map/discovery.md`; do not invent dangling relationships to represent uncertainty.

Read/write example: `map.mjs read` returns `{ "data": { "version": 1, "objects": [] }, "revision": "…" }`. Edit the `data` value into a candidate file, validate it, then call `map.mjs write candidate.json --revision THE_ORIGINAL_REVISION`. Preserve unknown metadata. Concurrent writes are rejected, not merged automatically.
