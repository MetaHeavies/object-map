import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  makeObject,
  addItem,
  promote,
  demote,
  removeObject,
  validateMap,
  changesBetween,
} from "../src/model.mjs";
import { Store, initialize } from "../server/store.mjs";
import { install } from "../scripts/install.mjs";
const empty = () => ({ version: 1, objects: [] });
function fixture() {
  let map = empty();
  map.objects.push(makeObject(map, "Place"));
  return addItem(map, "obj:place", "attributes", "Opening hours");
}
test("promotion preserves meaning, creates a relationship, and can reverse without losing the attribute ID", () => {
  const original = fixture(),
    result = promote(original, "obj:place", "obj:place/attr:opening-hours");
  assert.equal(original.objects.length, 1);
  assert.equal(result.map.objects.length, 2);
  assert.equal(result.map.objects[0].attributes.length, 0);
  assert.equal(result.map.objects[0].relationships[0].target, result.object.id);
  assert.equal(validateMap(result.map), true);
  assert.deepEqual(demote(result.map, result.object.id), original);
});
test("demotion refuses to discard newly designed structure", () => {
  const result = promote(
    fixture(),
    "obj:place",
    "obj:place/attr:opening-hours",
  );
  const next = addItem(result.map, result.object.id, "attributes", "Opens at");
  assert.throws(() => demote(next, result.object.id), /added structure/);
});
test("IDs remain unique through colliding names and object deletion cleans inbound relationships", () => {
  let map = fixture();
  map.objects.push(makeObject(map, "Place"));
  assert.equal(map.objects[1].id, "obj:place-2");
  map = addItem(
    map,
    "obj:place",
    "relationships",
    "Another place",
    "obj:place-2",
  );
  map = removeObject(map, "obj:place-2");
  assert.equal(map.objects[0].relationships.length, 0);
  assert.equal(validateMap(map), true);
  const bad = structuredClone(map);
  bad.objects[0].attributes.push({ ...bad.objects[0].attributes[0] });
  assert.throws(() => validateMap(bad), /unique/);
});
test("semantic change summaries include actions and renames while stable IDs survive", () => {
  const original = fixture(),
    next = addItem(original, "obj:place", "actions", "Archive");
  next.objects[0].name = "Location";
  const changes = changesBetween(original, next);
  assert.ok(changes.some((x) => x.includes("Place → Location")));
  assert.ok(changes.some((x) => x.includes("actions: Archive")));
  assert.equal(next.objects[0].id, original.objects[0].id);
});
test("layout writes leave semantic bytes unchanged and stale semantic saves fail", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "object-map-store-"));
  await initialize(root);
  const store = new Store(root),
    map = await store.read("map"),
    layout = await store.read("layout");
  await store.write(
    "layout",
    { ...layout.data, positions: { "obj:place": { x: 500, y: 300 } } },
    layout.revision,
  );
  assert.equal((await store.read("map")).revision, map.revision);
  await store.write("map", fixture(), map.revision);
  await assert.rejects(
    store.write("map", empty(), map.revision),
    /another session/,
  );
});
test("installer preserves existing agent instructions and an existing map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "object-map-install-"));
  await writeFile(
    path.join(root, "AGENTS.md"),
    "# Existing rules\nKeep this.\n",
  );
  await install(root);
  const first = await readFile(path.join(root, "AGENTS.md"), "utf8");
  await install(root);
  assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), first);
  assert.ok(first.startsWith("# Existing rules"));
  const store = new Store(root),
    old = await store.read("map");
  await store.write("map", fixture(), old.revision);
  await install(root);
  assert.deepEqual((await store.read("map")).data, fixture());
});

test("selection highlights incoming and outgoing relationships, but excludes two-hop objects", async () => {
  const { focusContext } = await import("../src/model.mjs");
  let map = empty();
  for (const name of ["Place", "City", "Country", "Collection", "Person"])
    map.objects.push(makeObject(map, name));
  map = addItem(map, "obj:place", "relationships", "City", "obj:city");
  map = addItem(map, "obj:city", "relationships", "Country", "obj:country");
  map = addItem(map, "obj:collection", "relationships", "Places", "obj:place");
  const focus = focusContext(map, "obj:place");
  assert.deepEqual([...focus.objects].sort(), [
    "obj:city",
    "obj:collection",
    "obj:place",
  ]);
  assert.equal(focus.relationships.size, 2);
  assert.ok(!focus.objects.has("obj:country"));
  assert.ok(!focus.objects.has("obj:person"));
  assert.equal(focusContext(map, null).objects.size, 0);
});
