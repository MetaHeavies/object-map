import assert from 'node:assert/strict';

export async function testNavigation(page) {
  const saved = () => page.waitForFunction(() => document.querySelector('.app-shell')?.dataset.saveState === 'Saved');
  const workspace = async () => (await page.request.get(new URL('/api/workspace', page.url()).href)).json();
  const viewport = () => page.locator('.world').evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return {x: matrix.e, y: matrix.f, zoom: matrix.a};
  });
  await saved();
  const original = await workspace();
  const canvas = await page.locator('.canvas').boundingBox();
  const point = {x: 650, y: 110};
  const before = await viewport();
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(z => Number(document.querySelector('.world').dataset.zoom) < z, before.zoom);
  const after = await viewport();
  for (const axis of ['x', 'y']) {
    const local = point[axis] - canvas[axis];
    assert.ok(Math.abs((local - before[axis]) / before.zoom - (local - after[axis]) / after.zoom) < .1, 'Wheel zoom keeps the point under the cursor anchored');
  }
  await page.mouse.dblclick(point.x, point.y);
  assert.ok(Math.abs((await viewport()).zoom - after.zoom * 1.5) < .001, 'Double-click zooms in');
  await page.keyboard.down('Shift');
  await page.mouse.dblclick(point.x, point.y);
  await page.keyboard.up('Shift');
  assert.ok(Math.abs((await viewport()).zoom - after.zoom) < .001, 'Shift-double-click zooms out');
  await page.getByRole('button', {name: 'Canvas settings', exact: true}).click();
  const panelView = await viewport();
  await page.locator('.motion-settings').hover();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  assert.deepEqual(await viewport(), panelView, 'Scrolling settings does not zoom the canvas');
  await page.getByRole('button', {name: 'Close panel', exact: true}).click();
  await saved();
  const current = await workspace();
  const response = await page.request.put(new URL('/api/layout', page.url()).href, {data: {
    revision: current.revisions.layout,
    data: {...current.layout, viewport: {x: 500, y: -20000, zoom: 1}},
  }});
  assert.ok(response.ok());
  await page.reload();
  await page.locator('.object-heading').first().waitFor();
  await saved();
  assert.ok((await viewport()).y > 0, 'Opening an entirely offscreen saved map recovers its viewport');
  await page.locator('.workspace-name').click();
  await page.getByRole('button', {name: 'Show saved map', exact: true}).click();
  assert.equal(await page.locator('.side-panel').count(), 0);
  await saved();
  const recovered = await workspace();
  assert.deepEqual(recovered.map, original.map, 'Navigation and viewport recovery preserve the saved model');
  const restore = await page.request.put(new URL('/api/layout', page.url()).href, {data: {
    revision: recovered.revisions.layout, data: original.layout,
  }});
  assert.ok(restore.ok());
  await page.reload();
  await page.locator('.object-heading').first().waitFor();
  console.log('Navigation passed: pointer-anchored wheel zoom, double-click, panel scrolling, saved-map recovery and unchanged model.');
}
