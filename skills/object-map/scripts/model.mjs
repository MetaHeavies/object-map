export const sections = ["attributes", "relationships", "actions", "states"];
const prefixes = {
  attributes: "attr",
  relationships: "rel",
  actions: "action",
  states: "state",
};
export const clone = (value) => structuredClone(value);
export const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
export function uniqueId(base, used) {
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  return id;
}
export function ids(map) {
  return new Set(
    map.objects.flatMap((o) => [
      o.id,
      ...sections.flatMap((s) => o[s].map((i) => i.id)),
    ]),
  );
}
export function makeObject(map, name) {
  return {
    id: uniqueId(`obj:${slug(name)}`, ids(map)),
    name,
    description: "",
    status: "intended",
    attributes: [],
    relationships: [],
    actions: [],
    states: [],
    evidence: [],
  };
}
export function addItem(map, objectId, section, name, target) {
  const next = clone(map),
    object = next.objects.find((o) => o.id === objectId);
  if (!object || !sections.includes(section) || !name.trim())
    throw new Error("An item needs an object and a name.");
  if (section === "relationships" && !map.objects.some((o) => o.id === target))
    throw new Error("Choose an existing object.");
  object[section].push({
    id: uniqueId(`${objectId}/${prefixes[section]}:${slug(name)}`, ids(next)),
    name: name.trim(),
    status: "intended",
    ...(section === "relationships" ? { target } : {}),
  });
  return next;
}
export function promote(map, objectId, attributeId) {
  const next = clone(map),
    parent = next.objects.find((o) => o.id === objectId);
  const index = parent?.attributes.findIndex((a) => a.id === attributeId);
  if (index === undefined || index < 0)
    throw new Error("Attribute no longer exists.");
  const attribute = parent.attributes[index],
    object = makeObject(next, attribute.name);
  object.promotedFrom = { objectId, attribute: clone(attribute) };
  parent.attributes.splice(index, 1);
  // The attribute's name is only a placeholder role: it necessarily repeats the
  // new object's name, which says nothing about how the two relate. The caller
  // is expected to ask for a predicate while the builder is still in the gesture.
  const relationship = {
    id: uniqueId(`${parent.id}/rel:${slug(attribute.name)}`, ids(next)),
    name: attribute.name,
    target: object.id,
    promotedFrom: attribute.id,
  };
  parent.relationships.push(relationship);
  next.objects.splice(next.objects.indexOf(parent) + 1, 0, object);
  return { map: next, object, relationship };
}
export function demote(map, objectId) {
  const next = clone(map),
    object = next.objects.find((o) => o.id === objectId);
  if (!object?.promotedFrom)
    throw new Error(
      "Only promoted objects can return to their original attribute.",
    );
  const parent = next.objects.find(
    (o) => o.id === object.promotedFrom.objectId,
  );
  const inbound = next.objects.flatMap((o) =>
    o.relationships.filter((r) => r.target === objectId),
  );
  if (
    !parent ||
    sections.some((s) => object[s].length) ||
    inbound.length !== 1 ||
    inbound[0].promotedFrom !== object.promotedFrom.attribute.id
  )
    throw new Error(
      "Remove added structure and extra relationships before demoting. Undo can restore a complete earlier version.",
    );
  parent.attributes.push({
    ...object.promotedFrom.attribute,
    name: object.name,
  });
  parent.relationships = parent.relationships.filter(
    (r) => r.target !== objectId,
  );
  next.objects = next.objects.filter((o) => o.id !== objectId);
  return next;
}
export function removeObject(map, id) {
  const next = clone(map);
  next.objects = next.objects.filter((o) => o.id !== id);
  for (const o of next.objects)
    o.relationships = o.relationships.filter((r) => r.target !== id);
  return next;
}
export function validateMap(map) {
  if (!map || map.version !== 1 || !Array.isArray(map.objects))
    throw new Error("Unsupported map format.");
  const all = new Set(),
    objects = new Set(map.objects.map((o) => o.id));
  for (const o of map.objects)
    for (const container of o.within || [])
      if (!objects.has(container))
        throw new Error('An object appears inside a missing object.');
  for (const o of map.objects) {
    if (
      typeof o.id !== "string" ||
      !o.id.startsWith("obj:") ||
      typeof o.name !== "string" ||
      !o.name.trim()
    )
      throw new Error("Every object needs an identifier and a name.");
    for (const item of [
      o,
      ...sections.flatMap((s) => {
        if (!Array.isArray(o[s])) throw new Error(`Missing ${s}.`);
        return o[s];
      }),
    ]) {
      if (
        typeof item.id !== "string" ||
        all.has(item.id) ||
        typeof item.name !== "string" ||
        !item.name.trim()
      )
        throw new Error("Names and unique stable identifiers are required.");
      all.add(item.id);
      if (item.status !== undefined && !['intended', 'observed', 'mixed'].includes(item.status))
        throw new Error('Invalid implementation status.');
      if (item.evidence !== undefined && (!Array.isArray(item.evidence) || item.evidence.some(value => typeof value !== 'string')))
        throw new Error('Evidence must be an array of source paths.');
      if (item.filterable !== undefined && typeof item.filterable !== 'boolean')
        throw new Error('Filterable must be true or false.');
      if (item.cardinality !== undefined && !['one', 'many'].includes(item.cardinality))
        throw new Error('Cardinality is one or many.');
    }
    if (o.destination !== undefined && typeof o.destination !== 'boolean')
      throw new Error('Destination must be true or false.');
    if (o.within !== undefined) {
      if (!Array.isArray(o.within) || o.within.some(value => typeof value !== 'string'))
        throw new Error('Within must be an array of object identifiers.');
      if (o.within.includes(o.id)) throw new Error('An object cannot appear inside itself.');
    }
    for (const r of o.relationships)
      if (!objects.has(r.target))
        throw new Error("A relationship points to a missing object.");
  }
  return true;
}
export function validateLayout(layout) {
  if (
    !layout ||
    layout.version !== 1 ||
    !layout.positions ||
    typeof layout.positions !== "object"
  )
    throw new Error("Invalid layout.");
  for (const p of Object.values(layout.positions))
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      throw new Error("Invalid object position.");
  return true;
}
export function changesBetween(before, after) {
  const changes = [];
  for (const o of after.objects) {
    const old = before.objects.find((x) => x.id === o.id);
    if (!old) changes.push(`+ Object: ${o.name} (${o.id})`);
    else if (old.name !== o.name)
      changes.push(`~ ${o.id}: ${old.name} → ${o.name}`);
    if (old && old.description !== o.description)
      changes.push(`~ ${o.id}: description updated`);
    if (old && old.status !== o.status)
      changes.push(`~ ${o.id}: ${o.status || 'unassessed'}`);
    for (const section of sections) {
      for (const i of o[section]) {
        const prev = old?.[section].find((x) => x.id === i.id);
        if (!prev)
          changes.push(
            `+ ${o.name} / ${section}: ${i.name}${i.target ? ` → ${i.target}` : ""} (${i.id})`,
          );
        else if (prev.name !== i.name || prev.target !== i.target || prev.status !== i.status)
          changes.push(
            `~ ${i.id}: ${i.name}${i.target ? ` → ${i.target}` : ""}`,
          );
      }
      for (const i of old?.[section] || [])
        if (!o[section].some((x) => x.id === i.id))
          changes.push(`− ${i.id}: ${i.name}`);
    }
  }
  for (const o of before.objects)
    if (!after.objects.some((x) => x.id === o.id))
      changes.push(`− Object: ${o.name} (${o.id})`);
  return changes;
}

// Focus is exactly one hop in either direction, never a transitive graph walk.
export function focusContext(map, id) {
  const objects = new Set(id ? [id] : []),
    relationships = new Set();
  if (id)
    for (const object of map.objects)
      for (const relationship of object.relationships) {
        if (object.id === id || relationship.target === id) {
          objects.add(object.id);
          objects.add(relationship.target);
          relationships.add(relationship.id);
        }
      }
  return { objects, relationships };
}

// The agent records what it could not settle in .object-map/discovery.md. It is
// the most useful thing it writes and nothing surfaced it, so check reads it back.
export function unresolvedQuestions(notes) {
  const lines = (notes || '').split('\n');
  const start = lines.findIndex(line => /^##\s+unresolved questions\s*$/i.test(line.trim()));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim().split(/\n(?=\s*(?:\d+\.|[-*])\s)/)
    .map(entry => entry.trim()).filter(Boolean);
}

// A reading of the map you can act on: what connects to nothing, what nobody
// can act on, what has no definition, and labels that only repeat their target.
export function checkMap(map) {
  const plain = value => (value || '').toLowerCase().replace(/[^a-z]/g, '');
  const inbound = Object.fromEntries(map.objects.map(object => [object.id, 0]));
  for (const object of map.objects)
    for (const relationship of object.relationships || [])
      if (inbound[relationship.target] !== undefined) inbound[relationship.target]++;
  return map.objects.map(object => {
    const out = object.relationships || [], into = inbound[object.id], warnings = [];
    if (!out.length && !into) warnings.push('connects to nothing');
    if (!(object.actions || []).length && !into) warnings.push('nothing can be done to it');
    if (!object.description) warnings.push('no definition');
    const echoes = out.filter(relationship => {
      const target = map.objects.find(candidate => candidate.id === relationship.target);
      return target && plain(relationship.name) === plain(target.name);
    });
    if (echoes.length) warnings.push(`label repeats its target: ${echoes.map(r => r.name).join(', ')}`);
    if (object.status !== 'intended' && !(object.evidence || []).length) warnings.push('no evidence recorded');
    // Placed on a surface it has no structural connection to. Either the
    // relationship was missed or the placement is wrong, and both matter.
    const linked = new Set([
      ...out.map(relationship => relationship.target),
      ...map.objects.filter(other => (other.relationships || []).some(r => r.target === object.id)).map(other => other.id),
    ]);
    const stranded = (object.within || []).filter(container => !linked.has(container));
    if (stranded.length) {
      const names = stranded.map(id => map.objects.find(o => o.id === id)?.name || id);
      warnings.push(`appears inside ${names.join(' and ')} with no relationship to it`);
    }
    return {
      id: object.id, name: object.name, status: object.status,
      destination: !!object.destination, within: object.within || [],
      attributes: (object.attributes || []).length, relationships: out.length, inbound: into,
      actions: (object.actions || []).length, states: (object.states || []).length,
      filterable: (object.attributes || []).filter(a => a.filterable).map(a => a.name),
      warnings,
    };
  });
}
