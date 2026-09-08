import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Changes implementation fixtures only. It deliberately never opens .object-map.
export async function applyScenario(root, scenario = "drift") {
  if (!["drift", "opening-hours", "companions"].includes(scenario))
    throw new Error("Use drift, opening-hours, or companions.");
  const page = JSON.parse(
    await readFile(
      path.join(
        root,
        `src/pages/${scenario === "companions" ? "visit" : "place"}.json`,
      ),
      "utf8",
    ),
  );
  const modelPath = path.join(root, `src/models/${page.table}.json`),
    schemaPath = path.join(root, `database/schema/${page.table}.sql`);
  const model = JSON.parse(await readFile(modelPath, "utf8"));
  let schema = await readFile(schemaPath, "utf8");
  const fields =
    scenario === "drift"
      ? {
          booking_url: "text",
          price_level: "number",
          primary_contact_id: "contact",
        }
      : scenario === "companions"
        ? { companion_ids: "person[]" }
        : { opening_hours_id: "opening_hours" };
  if (Object.keys(fields).some((key) => key in model.fields))
    throw new Error("This scenario has already been applied.");
  if (scenario === "opening-hours") {
    delete model.fields.opening_hours;
    schema = schema.replace(/^\s*opening_hours TEXT,?\n/m, "");
  }
  const person = JSON.parse(
    await readFile(path.join(root, "src/pages/person.json"), "utf8"),
  );
  const resource =
    scenario === "drift"
      ? {
          resource: "contact",
          table: "place_contact",
          label: "Contact",
          plural: "Contacts",
          fields: {
            name: "text",
            role: "text",
            email: "text",
            phone: "text",
            notes: "text",
          },
        }
      : scenario === "opening-hours"
        ? {
            resource: "opening_hours",
            table: "opening_hours",
            label: "Opening Hours",
            plural: "Opening Hours",
            fields: {
              name: "text",
              day: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens_at: "text",
              closes_at: "text",
              closed: ["no", "yes"],
              special_hours: "text",
            },
          }
        : null;
  Object.assign(model.fields, fields);
  schema = schema.replace(
    /\n\);\s*$/,
    `,\n${Object.entries(fields)
      .map(
        ([key, type]) =>
          `  ${key} ${type === "number" ? "REAL" : "TEXT"}${type === "contact" ? ` REFERENCES place_contact(id)` : type === "opening_hours" ? ` REFERENCES opening_hours(id)` : type === "person[]" ? ` REFERENCES ${person.table}(id)` : ""}`,
      )
      .join(",\n")}\n);\n`,
  );
  if (resource) {
    const { fields: resourceFields, ...metadata } = resource;
    await writeFile(
      path.join(root, `src/pages/${resource.resource}.json`),
      JSON.stringify({ ...metadata, actions: ["Edit", "Delete"] }, null, 2) +
        "\n",
    );
    await writeFile(
      path.join(root, `src/models/${resource.table}.json`),
      JSON.stringify(
        { resource: resource.resource, fields: resourceFields },
        null,
        2,
      ) + "\n",
    );
    await writeFile(
      path.join(root, `database/schema/${resource.table}.sql`),
      `CREATE TABLE ${resource.table} (\n  id TEXT PRIMARY KEY,\n${Object.keys(
        resourceFields,
      )
        .map((key) => `  ${key} TEXT`)
        .join(",\n")}\n);\n`,
    );
    await writeFile(
      path.join(root, `src/services/${resource.resource}.mjs`),
      `export function prepare(record) { if (!record.name?.trim()) throw new Error('Name required.'); return record; }\n`,
    );
  }
  for (const filename of ["database/seed/data.json", "database/data.json"]) {
    const file = path.join(root, filename);
    let data;
    try {
      data = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    if (resource) data[resource.resource] = [];
    for (const record of data[page.resource]) {
      for (const [key, type] of Object.entries(fields))
        record[key] = type.endsWith("[]") ? [] : "";
      if (scenario === "opening-hours") {
        const id = `hours-${record.id}`;
        data.opening_hours.push({
          id,
          name: `${record.name} hours`,
          day: "Tuesday",
          opens_at: "10:00",
          closes_at: "18:00",
          closed: "no",
          special_hours: record.opening_hours || "",
        });
        record.opening_hours_id = id;
        delete record.opening_hours;
      }
    }
    await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  }
  await writeFile(modelPath, JSON.stringify(model, null, 2) + "\n");
  await writeFile(schemaPath, schema);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await applyScenario(
      path.resolve(process.argv[2] || "examples/atlas"),
      process.argv[3] || "drift",
    );
    console.log(
      "Implementation scenario applied. Restart Atlas; the Object Map remains unchanged.",
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
