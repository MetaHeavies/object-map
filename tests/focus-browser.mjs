import assert from "node:assert/strict";

export async function testFocus(page) {
  const city = page.locator('[data-object-id="obj:city"]');
  const place = page.locator('[data-object-id="obj:place"]');
  const collection = page.locator('[data-object-id="obj:collection"]');
  const attributeSection = place.locator('[data-section="attributes"]');
  await page.waitForTimeout(320);
  const headers = await page.locator(".object-heading").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    }),
  );
  const fullHeight = await attributeSection.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  // Sample actual rendered intermediate heights, not just transition declarations.
  await page.evaluate(() => {
    window.focusFrames = [];
    const section = document.querySelector(
      '[data-object-id="obj:place"] [data-section="attributes"]',
    );
    const start = performance.now();
    const frame = () => {
      window.focusFrames.push(section.getBoundingClientRect().height);
      if (performance.now() - start < 350) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await city.getByRole("button", { name: "Select City", exact: true }).click();
  await page.waitForTimeout(380);
  const heights = await page.evaluate(() => window.focusFrames);
  assert.ok(
    heights.some((h) => h > 1 && h < fullHeight - 1),
    "Focus must visibly interpolate the collapsed height",
  );
  assert.ok(
    await attributeSection.evaluate(
      (el) => el.getBoundingClientRect().height < 1,
    ),
    "Unrelated attributes reach zero height",
  );
  assert.equal(
    await attributeSection.getAttribute("inert"),
    "",
    "Hidden attributes cannot receive focus",
  );
  assert.ok((await place.getAttribute("class")).includes("related"));
  assert.ok((await collection.getAttribute("class")).includes("dimmed"));
  assert.equal(
    await place.locator(".is-relevant").count(),
    1,
    "City highlights the exact incoming relationship row",
  );
  assert.equal(await page.locator("svg.relationship-lines").count(), 0);
  const settledHeaders = await page
    .locator(".object-heading")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      }),
    );
  for (let i = 0; i < headers.length; i++) {
    assert.ok(
      Math.abs(headers[i].x - settledHeaders[i].x) < 1 &&
        Math.abs(headers[i].y - settledHeaders[i].y) < 1,
      "Headers stay anchored during focus",
    );
  }
  await city.getByRole("button", { name: "Select City", exact: true }).click();
  assert.ok(
    (await city.getAttribute("class")).includes("focused"),
    "Repeated selection is idempotent",
  );
  await page.screenshot({ path: "test-results/city-focus.png" });
  // Reverse while the grid is still moving, then check the selected column is usable.
  await place
    .getByRole("button", { name: "Select Place", exact: true })
    .click();
  await page.waitForTimeout(55);
  await city.getByRole("button", { name: "Select City", exact: true }).click();
  await page.waitForTimeout(55);
  await place
    .getByRole("button", { name: "Select Place", exact: true })
    .click();
  await page.waitForTimeout(300);
  assert.ok(
    await attributeSection.evaluate(
      (el) => el.getBoundingClientRect().height > 100,
    ),
  );
  assert.equal(await attributeSection.getAttribute("inert"), null);
  await page.screenshot({ path: "test-results/place-focus.png" });
  // Native focus on a relationship must never open an editor as a side effect.
  await place.getByRole("button", { name: "Go to City", exact: true }).click();
  assert.equal(
    await page.locator('.relationship-editor-reveal[data-open="true"]').count(),
    0,
  );
  assert.ok((await city.getAttribute("class")).includes("focused"));
  // A tiny amount of pointer noise still counts as a canvas click, not a pan.
  await page.mouse.move(650, 110);
  await page.mouse.down();
  await page.mouse.move(652, 111);
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".object-card.focused").count(), 0);
  assert.ok(
    await attributeSection.evaluate(
      (el) => el.getBoundingClientRect().height > 100,
    ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await city.getByRole("button", { name: "Select City", exact: true }).click();
  assert.ok(
    await attributeSection.evaluate(
      (el) => el.getBoundingClientRect().height < 1,
    ),
  );
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  // A manually collapsed container must still expose every matching occurrence.
  await place
    .getByRole("button", { name: "Collapse Place", exact: true })
    .click();
  await city.getByRole("button", { name: "Select City", exact: true }).click();
  const cityReference = place.locator('[data-motion-id="obj:place/rel:city"]');
  assert.ok(
    await cityReference.isVisible(),
    "City remains visible inside a manually collapsed Place",
  );
  assert.equal(
    await place.locator('[data-section="relationships"]').getAttribute("inert"),
    null,
  );
  assert.ok(
    await attributeSection.evaluate(
      (el) => el.getBoundingClientRect().height < 1,
    ),
  );
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  assert.equal(
    await place.locator('[data-section="relationships"]').getAttribute("inert"),
    "",
    "Clearing focus restores the manual collapse",
  );
  await place
    .getByRole("button", { name: "Expand Place", exact: true })
    .click();

  // Alias labels still refer to the same object: both Owner and Shared With
  // must survive, along with references in other containing objects.
  await collection
    .getByRole("button", { name: "Collapse Collection", exact: true })
    .click();
  await page.getByRole("button", { name: "Find an object (⌘K)" }).click();
  await page
    .getByRole("textbox", { name: "Find an object", exact: true })
    .fill("Person");
  await page
    .locator(".search-popover")
    .getByRole("button", { name: "Person", exact: true })
    .click();
  for (const id of [
    "obj:collection/rel:owner",
    "obj:collection/rel:shared-with",
    "obj:photo/rel:person",
    "obj:visit/rel:person",
  ]) {
    const row = page.locator(`[data-motion-id="${id}"]`);
    assert.ok(await row.isVisible(), `${id} must remain visible`);
    assert.ok(
      await row.evaluate((el) => !el.closest("[inert]")),
      `${id} must remain interactive`,
    );
    assert.ok((await row.getAttribute("class")).includes("is-relevant"));
  }
  assert.ok(
    await collection
      .locator('[data-section="attributes"]')
      .evaluate((el) => el.getBoundingClientRect().height < 1),
  );
  await page.screenshot({ path: "test-results/person-references.png" });
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  // Restore only the view preference changed by the test, without changing data.
  await collection
    .getByRole("button", { name: "Expand Collection", exact: true })
    .dispatchEvent("click");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  console.log(
    "Focus passed: animated zero-height collapse, anchored headers, exact relationships, rapid reversal, pointer noise, and reduced motion.",
  );
}
