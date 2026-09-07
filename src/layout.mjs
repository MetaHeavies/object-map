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
