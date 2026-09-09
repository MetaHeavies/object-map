import { sections } from "./model.mjs";
export const COLUMN_WIDTH = 250;
export const COLUMN_GAP = 32;
export const COLUMN_STEP = COLUMN_WIDTH + COLUMN_GAP;
export const defaultPosition = index => ({ x: index * COLUMN_STEP, y: 0 });

// Keep the horizontal order of older free-position maps when aligning them.
// Semantic object order is independent of the visual column order.
export function columnOrder(map, layout) {
  return map.objects.map((object, index) => ({
    id: object.id,
    x: layout.positions[object.id]?.x ?? defaultPosition(index).x,
    index,
  })).sort((a, b) => a.x - b.x || a.index - b.index).map(object => object.id);
}
export function reorderColumns(order, id, x) {
  const next = order.filter(value => value !== id);
  const index = Math.max(0, Math.min(next.length, Math.round(x / COLUMN_STEP)));
  next.splice(index, 0, id);
  return next;
}
export function positionsForOrder(order) {
  return Object.fromEntries(order.map((id, index) => [id, defaultPosition(index)]));
}
export function arrange(map, layout, expanded, dimensions = {}, drag = null, focus = null) {
  const order = drag?.order ?? columnOrder(map, layout);
  const positions = positionsForOrder(order);
  if (drag) positions[drag.id] = drag.point;
  // Under focus the irrelevant columns are hidden rather than dimmed, so the ones
  // that remain close the gaps. The clicked column holds its place and the rest
  // gather around it, keeping their left-to-right order.
  if (focus?.visible?.size && positions[focus.id]) {
    const visible = order.filter(id => focus.visible.has(id));
    const anchor = visible.indexOf(focus.id);
    const anchorX = positions[focus.id].x;
    visible.forEach((id, index) => {
      positions[id] = { ...positions[id], x: anchorX + (index - anchor) * COLUMN_STEP };
    });
  }
  const placed = map.objects.map(object => {
    const open = expanded.includes(object.id);
    const height = dimensions[`${object.id}:${open}`] || (open
      ? 100 + sections.reduce((total, section) => total + object[section].length * 33, 0)
      : 70);
    return { ...positions[object.id], id: object.id, width: COLUMN_WIDTH, height };
  });
  return { positions, placed };
}

export const LEVEL_GAP = 40;
export const GROUP_GAP = 88;
// The outline is a reading of the product, not a second model. Objects at the
// same level stay side by side as columns; what sits under an object is what a
// person only meets inside it. An object met in two places appears in both,
// and selecting one copy selects them all.
export function hierarchy(map, dimensions = {}) {
  const byId = new Map(map.objects.map(object => [object.id, object]));
  const children = new Map(map.objects.map(object => [object.id, []]));
  for (const object of map.objects)
    for (const container of object.within || [])
      if (children.has(container)) children.get(container).push(object.id);
  const heightOf = id => dimensions[`${id}:false`] || 70;
  const kidsOf = (id, path) => (children.get(id) || []).filter(child => !path.includes(child));

  // A subtree is as wide as its children need, and never narrower than a card.
  const band = (id, path) => {
    const kids = kidsOf(id, path);
    if (!kids.length) return COLUMN_WIDTH;
    const widths = kids.map(child => band(child, [...path, id]));
    return Math.max(COLUMN_WIDTH, widths.reduce((a, b) => a + b, 0) + COLUMN_GAP * (kids.length - 1));
  };

  const placements = [];
  const seen = new Set();
  const place = (id, x, depth, path) => {
    const object = byId.get(id);
    if (!object) return;
    placements.push({
      key: `${path.join('>')}>${id}`,
      id, depth, x, y: 0,
      repeat: seen.has(id),
      width: COLUMN_WIDTH,
      height: heightOf(id),
    });
    seen.add(id);
    let cursor = x;
    for (const child of kidsOf(id, path)) {
      place(child, cursor, depth + 1, [...path, id]);
      cursor += band(child, [...path, id]) + COLUMN_GAP;
    }
  };

  const row = (ids, startIndex) => {
    let x = 0;
    for (const id of ids) {
      place(id, x, 0, []);
      x += band(id, []) + COLUMN_GAP;
    }
    return placements.slice(startIndex);
  };

  const groups = [];
  const destinations = map.objects.filter(object => object.destination).map(object => object.id);
  const loose = map.objects
    .filter(object => !object.destination && !(object.within || []).length)
    .map(object => object.id);

  const sections = [];
  if (destinations.length) sections.push({ label: 'Has a page of its own', ids: destinations });
  if (loose.length) sections.push({ label: 'Not on any page yet', ids: loose });

  let top = 0;
  for (const section of sections) {
    const from = placements.length;
    const members = row(section.ids, from);
    // Every card on a level shares a baseline, so levels read as levels.
    const levels = [...new Set(members.map(placement => placement.depth))].sort((a, b) => a - b);
    let y = top + LEVEL_GAP;
    const levelY = new Map();
    for (const level of levels) {
      levelY.set(level, y);
      y += Math.max(...members.filter(p => p.depth === level).map(p => p.height)) + LEVEL_GAP;
    }
    for (const placement of members) placement.y = levelY.get(placement.depth);
    groups.push({ label: section.label, y: top });
    top = y - LEVEL_GAP + GROUP_GAP;
  }

  const boxes = [
    ...placements,
    ...groups.map(group => ({ x: 0, y: group.y, width: COLUMN_WIDTH, height: 32 })),
  ];
  return {
    placements, groups, boxes,
    assessed: destinations.length > 0 || map.objects.some(object => (object.within || []).length),
  };
}
