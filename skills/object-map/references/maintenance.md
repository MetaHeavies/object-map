# Keep the map current while building

For each task, compare three things: the current map, the builder’s request, and the changed implementation. Limit the review to affected concepts and their direct relationships unless the work crosses a wider boundary.

- A builder adds Pizza and describes its meaning: retain it as intended work. Add only the attributes or actions they actually specify.
- The agent implements a booking URL on Place: add the user-relevant attribute with evidence and observed status as part of the same authorized task.
- Code is renamed internally: retain the product name and stable ID unless the product’s vocabulary actually changed.
- A feature removes or replaces behavior: update corresponding map entries when that removal was authorized. Do not delete an object merely because a source file moved or discovery stopped finding it.
- Code contradicts a builder decision: preserve the decision, describe the mismatch and ask only the product question needed to resolve it. Evidence updates and conflict reporting can continue.
- A UI-only polish, infrastructure fix or discussion leaves the product concepts unchanged: record a no-change review with a reason. Do not generate fake object edits.
- A partial implementation succeeds: distinguish the observed portion from remaining intent. Do not mark the entire object implemented because its first endpoint exists.

Prefer small edits to a fresh snapshot. Preserve optional metadata and unknown fields. Map updates must not write canvas layout. The browser and agent share the revision-checked store; if a builder edits during the turn, reread and merge rather than restoring your earlier snapshot.

Hooks supply fresh context on session start and each submitted user prompt. The Stop hook asks for a missing review once, then allows completion to avoid a loop. The receipt checks that the map revision has not changed since the review; it does not inspect your reasoning or prove code/map equivalence. If validation or reconciliation cannot complete, tell the builder what remains unchecked.
