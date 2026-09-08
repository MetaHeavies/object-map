import { chromium } from "@playwright/test";
import { testAtlas } from "./atlas-browser.mjs";
import { testFocus } from "./focus-browser.mjs";
import { testSpacing } from "./spacing-browser.mjs";
import { testDrag } from "./drag-browser.mjs";
import { testNavigation } from "./navigation-browser.mjs";
import { testEditing } from "./editing-browser.mjs";
import { testLiveMap } from "./live-map-browser.mjs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { generate } from "../generator/generate.mjs";
import { install } from "../scripts/install.mjs";
const temporary = await mkdtemp(path.join(os.tmpdir(), "object-map-browser-"));
const root = path.join(temporary, "atlas");
await generate(root);
await install(root);
// The canvas is populated by an agent, so the journey starts from a written map
// rather than from anything the viewer itself can extract.
await writeFile(
  path.join(root, ".object-map/map.json"),
  await readFile(new URL("./atlas-map.json", import.meta.url), "utf8"),
);
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", "5176", "--strictPort"],
  { env: { ...process.env, OBJECT_MAP_REPO: root }, stdio: "pipe" },
);
server.stderr.on("data", (chunk) => process.stderr.write(chunk));
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    if ((await fetch("http://127.0.0.1:5176/api/workspace")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("test-results", { recursive: true });
try {
  await page.goto("http://127.0.0.1:5176");
  await page
    .getByRole("button", { name: "Options for Place", exact: true })
    .waitFor({ state: "attached" });
  await page.keyboard.press("f");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/loaded.png" });
  await testSpacing(page);
  await testDrag(page);
  await testFocus(page);
  await testNavigation(page);
  await testEditing(page);

  await page.getByRole("button", { name: "Find an object (⌘K)" }).click();
  await page
    .getByRole("textbox", { name: "Find an object", exact: true })
    .fill("Place");
  await page
    .locator(".canvas-search")
    .getByRole("button", { name: "Place", exact: true })
    .click();
  const place = page.locator('[data-object-id="obj:place"]');
  await place
    .getByRole("button", { name: "Add to Place", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Attribute", exact: true }).click();
  await page
    .getByRole("textbox", { name: "New attribute", exact: true })
    .fill("Contact");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .locator(".mini-card")
    .filter({
      has: page.getByRole("button", { name: "Select Contact", exact: true }),
    })
    .hover();
  await page
    .getByRole("button", { name: "Promote Contact to object", exact: true })
    .click();
  // Reshaping the model is confirmed before it happens.
  await page
    .getByRole("alertdialog", { name: "Make Contact its own object?" })
    .getByRole("button", { name: "Promote to object", exact: true })
    .click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Find an object (⌘K)" }).click();
  await page
    .getByRole("textbox", { name: "Find an object", exact: true })
    .fill("Place");
  await page
    .locator(".canvas-search")
    .getByRole("button", { name: "Place", exact: true })
    .click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/promotion.png" });
  if ((await page.locator('[data-object-id="obj:contact"]').count()) !== 1)
    throw new Error("Promotion did not create Contact");
  await page.getByRole("button", { name: "Undo (⌘Z)", exact: true }).click();
  if ((await page.locator('[data-object-id="obj:contact"]').count()) !== 0)
    throw new Error("Undo did not reverse promotion");
  await page.getByRole("button", { name: "Redo (⇧⌘Z)", exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Find an object (⌘K)" }).click();
  await page
    .getByRole("textbox", { name: "Find an object", exact: true })
    .fill("Contact");
  await page
    .locator(".canvas-search")
    .getByRole("button", { name: "Contact", exact: true })
    .click();
  const contact = page.locator('[data-object-id="obj:contact"]');
  await contact
    .getByRole("button", { name: "Add to Contact", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Attribute", exact: true }).click();
  await contact
    .getByRole("textbox", { name: "New attribute", exact: true })
    .fill("Email");
  await contact.getByRole("button", { name: "Add", exact: true }).click();
  if (await contact.locator('.column-add').count() !== 1 || await contact.locator('.add-item').count())
    throw new Error("Each column should have one add control");
  const addToContact = contact.getByRole("button", { name: "Add to Contact", exact: true });
  await addToContact.click();
  await page.keyboard.press("ArrowDown");
  if (await page.getByRole("menuitem", { name: "Relationship", exact: true }).evaluate(el => el !== document.activeElement))
    throw new Error("Add chooser arrow navigation failed");
  await page.keyboard.press("Escape");
  if (await addToContact.evaluate(el => el !== document.activeElement))
    throw new Error("Escape should restore add button focus");
  for (const [choice, section, name] of [["CTA", "actions", "Send message"], ["State", "states", "Verified"], ["Relationship", "relationships", "Person"]]) {
    await addToContact.click();
    await page.getByRole("menuitem", { name: choice, exact: true }).click();
    const group = contact.locator(`[data-section="${section}"]`);
    await group.getByRole("textbox").fill(name);
    if (choice === "Relationship") await group.locator('.suggestions').getByRole("button", { name, exact: true }).click();
    await group.getByRole("button", { name: choice === "Relationship" ? "Connect" : "Add", exact: true }).click();
    await group.locator('.mini-card').filter({hasText: name}).waitFor({state:"visible"});
    if (await contact.locator('.item-composer').count()) throw new Error("Successful add should close composer");
  }
  const groupOrder = await contact.locator('[data-section]').evaluateAll(nodes => nodes.map(node => node.dataset.section));
  if (groupOrder.join(',') !== 'attributes,relationships,actions,states') throw new Error("New rows must preserve group hierarchy");
  await addToContact.click();
  await page.getByRole("menuitem", { name: "Attribute", exact: true }).click();
  await contact.getByRole("textbox", { name: "New attribute", exact: true }).fill("Uncommitted");
  await contact.getByRole("button", { name: "Cancel", exact: true }).click();
  if (await contact.getByText("Uncommitted", {exact:true}).count()) throw new Error("Cancel should discard the draft");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  if (
    !(await page.locator(".change-list").textContent()).includes(
      "Contact / attributes: Email",
    )
  )
    throw new Error("Handoff missing change");
  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".app-shell").dataset.saveState === "Saved",
  );
  await page.reload();
  await page.waitForSelector('[data-object-id="obj:contact"]');
  await page.getByRole("button", { name: "Fit all objects (F)" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/landscape.png" });
  await testLiveMap(page, root);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/mobile.png" });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error("Mobile document overflows");
  if (errors.length) throw new Error(errors.join("\n"));
  await testAtlas(browser, root);
  console.log(
    "Browser journey passed: inline editing, promotion, undo/redo, handoff, persistence, mobile.",
  );
} catch (error) {
  await page.screenshot({ path: "test-results/failure.png" });
  console.error(await page.locator("body").innerText());
  throw error;
} finally {
  await browser.close();
  server.kill();
}
