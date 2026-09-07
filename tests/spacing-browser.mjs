import assert from "node:assert/strict";

export async function testSpacing(page) {
  const columns = await page.locator('.object-card').evaluateAll(nodes => nodes.map(node => ({
    left: parseFloat(node.style.translate), width: node.offsetWidth,
  })).sort((a,b) => a.left-b.left));
  for (let i = 1; i < columns.length; i++) {
    assert.equal(columns[i].left - columns[i-1].left - columns[i-1].width, 32, 'Column gutters are 32 canvas pixels');
  }
  const gaps = await page.locator('.object-card').evaluateAll(nodes => {
    const zoom = Number(document.querySelector('.world').dataset.zoom);
    return nodes.flatMap(node => {
      const rows = [...node.querySelectorAll('.object-heading, .mini-card, .column-add')]
        .filter(row => !row.closest('[inert]'))
        .map(row => row.getBoundingClientRect());
      return rows.slice(1).map((row,i) => (row.top - rows[i].bottom) / zoom);
    });
  });
  assert.ok(gaps.length > 20);
  for (const gap of gaps) assert.ok(Math.abs(gap-4) < .1, `Every row boundary uses 4px, got ${gap}`);
  console.log('Spacing passed: 32px column gutters and uniform 4px row gaps across groups.');
}
