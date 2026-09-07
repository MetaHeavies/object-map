import { spawn } from "node:child_process";
import path from "node:path";
export async function testAtlas(browser, root) {
  const server = spawn(process.execPath, [path.join(root, "server.mjs")], {
    env: { ...process.env, PORT: "4319" },
    stdio: "pipe",
  });
  const page = await browser.newPage({
    viewport: { width: 1300, height: 1000 },
  });
  async function commit(name) {
    const response = page.waitForResponse(r => r.url().endsWith('/api') && r.request().method() === 'POST');
    await page.getByRole('button', {name, exact:true}).click();
    const result = await response;
    if (!result.ok()) throw new Error(`Atlas save failed: ${await result.text()}`);
    await page.locator('#new').waitFor();
  }
  try {
    for (let n = 0; n < 100; n++) {
      try {
        if ((await fetch("http://127.0.0.1:4319/api")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    await page.goto("http://127.0.0.1:4319");
    await page
      .getByRole("button", { name: "+ Add place", exact: true })
      .click();
    await page.locator('[name="name"]').fill("Test Gallery");
    await page.locator('[name="city_id"]').selectOption("city-1");
    await commit("Save place");
    let state = await page.evaluate(() => fetch("/api").then((r) => r.json()));
    const place = state.data.place.find((x) => x.name === "Test Gallery");
    if (!place) throw new Error("Place was not created");
    await page
      .locator("#nav")
      .getByRole("button", { name: "Collections", exact: true })
      .click();
    await page
      .getByRole("button", { name: "+ Add collection", exact: true })
      .click();
    await page.locator('[name="name"]').fill("Test collection");
    await page.locator('[name="place_ids"]').selectOption([place.id]);
    await page.locator('[name="shared_with_ids"]').selectOption(["person-2"]);
    await page.locator('[name="visibility"]').selectOption("shared");
    await commit("Save collection");
    await page
      .locator("#nav")
      .getByRole("button", { name: "Visits", exact: true })
      .click();
    await page
      .getByRole("button", { name: "+ Add visit", exact: true })
      .click();
    await page.locator('[name="name"]').fill("Test visit");
    await page.locator('[name="place_id"]').selectOption(place.id);
    await page.locator('[name="person_id"]').selectOption("person-1");
    await commit("Save visit");
    await page
      .getByRole("button", { name: "Test visit planned", exact: true })
      .click();
    await commit("Mark completed");
    await page
      .locator("#nav")
      .getByRole("button", { name: "Notes", exact: true })
      .click();
    await page.getByRole("button", { name: "+ Add note", exact: true }).click();
    await page.locator('[name="body"]').fill("Test note");
    await page.locator('[name="place_id"]').selectOption(place.id);
    await commit("Save note");
    await page
      .locator("#nav")
      .getByRole("button", { name: "Photos", exact: true })
      .click();
    await page
      .getByRole("button", { name: "+ Add photo", exact: true })
      .click();
    await page.locator('[name="url"]').fill("https://example.com/test.jpg");
    await page.locator('[name="caption"]').fill("Test photo");
    await page.locator('[name="place_id"]').selectOption(place.id);
    await commit("Save photo");
    await page.reload();
    state = await page.evaluate(() => fetch("/api").then((r) => r.json()));
    if (
      state.data.visit.find((x) => x.name === "Test visit")?.status !==
      "completed"
    )
      throw new Error("Visit state did not persist");
    if (
      !state.data.note.some(
        (x) => x.body === "Test note" && x.place_id === place.id,
      )
    )
      throw new Error("Note relationship did not persist");
    if (!state.data.photo.some((x) => x.caption === "Test photo"))
      throw new Error("Photo record did not persist");
    if (
      !state.data.collection
        .find((x) => x.name === "Test collection")
        ?.shared_with_ids.includes("person-2")
    )
      throw new Error("Collection sharing did not persist");
    await page
      .locator("#nav")
      .getByRole("button", { name: "Places", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Test Gallery active", exact: true })
      .click();
    await commit("Delete");
    state = await page.evaluate(() => fetch("/api").then((r) => r.json()));
    if (
      state.data.place.some((x) => x.id === place.id) ||
      state.data.collection.some((x) => x.place_ids.includes(place.id))
    )
      throw new Error("Place removal left a dangling relationship");
    await page.screenshot({ path: "test-results/atlas.png" });
    console.log(
      "Atlas browser passed: places, collection membership/sharing, visit completion, notes, photos, reload, deletion cleanup.",
    );
  } finally {
    await page.close();
    server.kill();
  }
}
