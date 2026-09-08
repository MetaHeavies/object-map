import assert from "node:assert/strict";

async function toggleColumn(page, name) {
  await page.getByRole("button", { name: `Options for ${name}`, exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^(Collapse|Expand) ${name}$`) }).click();
}

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
  // Out-of-context columns are hidden, so the remaining ones close the gaps and
  // only the focused column keeps its place.
  const hiddenCount = await page.locator(".object-card.dimmed").count();
  assert.ok(hiddenCount > 0, "Out-of-context columns leave the layout");
  assert.ok(
    await page
      .locator(".object-card.dimmed")
      .first()
      .evaluate((el) => getComputedStyle(el).visibility === "hidden"),
    "A dimmed column is hidden rather than faint",
  );
  const focusedIndex = await page
    .locator(".object-card")
    .evaluateAll((nodes) => nodes.findIndex((n) => n.classList.contains("focused")));
  assert.ok(
    Math.abs(headers[focusedIndex].x - settledHeaders[focusedIndex].x) < 1 &&
      Math.abs(headers[focusedIndex].y - settledHeaders[focusedIndex].y) < 1,
    "The focused column holds its place while the others gather around it",
  );
  assert.ok(
    settledHeaders.some((h, i) => i !== focusedIndex && Math.abs(headers[i].x - h.x) > 1),
    "The remaining columns move in to close the gaps",
  );
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
  // Well clear of the find control, which is centred under the bar.
  await page.mouse.move(220, 760);
  await page.mouse.down();
  await page.mouse.move(222, 761);
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
  await toggleColumn(page, "Place");
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
  await toggleColumn(page, "Place");

  // Alias labels still refer to the same object: both Owned by and Shared with
  // must survive, along with references in other containing objects.
  await toggleColumn(page, "Collection");
  await page.getByRole("button", { name: "Find an object (⌘K)" }).click();
  await page
    .getByRole("textbox", { name: "Find an object", exact: true })
    .fill("Person");
  await page
    .locator(".canvas-search")
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
  await toggleColumn(page, "Collection");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  console.log(
    "Focus passed: animated zero-height collapse, an anchored focus column, exact relationships, rapid reversal, pointer noise, and reduced motion.",
  );
}
