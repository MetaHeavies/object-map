import { mkdir, writeFile, readFile, access, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const specs = [
  [
    "place",
    "Place",
    "Places",
    "saved_location",
    {
      name: "text",
      description: "text",
      address: "text",
      latitude: "number",
      longitude: "number",
      website: "text",
      phone: "text",
      instagram: "text",
      opening_hours: "text",
      status: ["active", "archived"],
      city_id: "city",
    },
    [
      "Edit",
      "Archive",
      "Add to collection",
      "Plan visit",
      "Add note",
      "Add photo",
    ],
  ],
  [
    "collection",
    "Collection",
    "Collections",
    "list",
    {
      name: "text",
      description: "text",
      visibility: ["private", "shared", "public"],
      owner_id: "person",
      place_ids: "place[]",
      shared_with_ids: "person[]",
    },
    ["Edit", "Add place", "Remove place", "Share", "Archive"],
  ],
  [
    "visit",
    "Visit",
    "Visits",
    "trip_event",
    {
      name: "text",
      planned_date: "date",
      completed_date: "date",
      status: ["planned", "completed", "cancelled"],
      rating: "number",
      private_note: "text",
      place_id: "place",
      person_id: "person",
    },
    ["Plan visit", "Complete", "Cancel", "Add note", "Add photo"],
  ],
  [
    "person",
    "Person",
    "People",
    "user",
    { name: "text", email: "text", avatar: "text", bio: "text" },
    ["Edit"],
  ],
  [
    "note",
    "Note",
    "Notes",
    "note",
    { body: "text", place_id: "place", visit_id: "visit", created_at: "date" },
    ["Edit", "Delete"],
  ],
  [
    "photo",
    "Photo",
    "Photos",
    "media_asset",
    {
      url: "text",
      caption: "text",
      taken_at: "date",
      place_id: "place",
      visit_id: "visit",
      person_id: "person",
    },
    ["Edit", "Delete"],
  ],
  [
    "city",
    "City",
    "Cities",
    "city",
    { name: "text", country: "text" },
    ["Edit"],
  ],
  [
    "tag",
    "Tag",
    "Tags",
    "tag",
    { name: "text", place_ids: "place[]" },
    ["Edit", "Apply to place"],
  ],
];
export async function generate(
  destination,
  { condition = "realistic", seed = 42 } = {},
) {
  if (
    !["clean", "realistic", "messy"].includes(condition) ||
    !Number.isFinite(Number(seed))
  )
    throw new Error("Use clean, realistic or messy, with a numeric seed.");
  try {
    await access(destination);
    throw new Error(
      `Destination already exists: ${destination}. Choose a new directory.`,
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (const folder of [
    "src/pages",
    "src/models",
    "src/services",
    "src/validation",
    "database/schema",
    "database/seed",
    "public",
  ])
    await mkdir(path.join(destination, folder), { recursive: true });
  let state = Number(seed) >>> 0;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const names = [
    "Casa Barragán",
    "Daunt Books",
    "Louisiana Museum",
    "Jim Thompson House",
    "Fondazione Prada",
    "Vitra Campus",
    "Noguchi Museum",
    "Serralves",
    "LACMA",
    "Teshima Art Museum",
    "Chichu Art Museum",
    "The Barbican",
    "Serpentine Gallery",
    "Pérez Art Museum",
    "Kettle’s Yard",
    "MAAT",
    "Guggenheim Bilbao",
    "Musée Rodin",
    "Kunsthaus Zürich",
    "National Gallery",
    "The Broad",
    "Shakespeare and Company",
    "Botanical Garden",
    "Design Museum",
  ];
  const cities = [
    "Mexico City",
    "London",
    "Humlebæk",
    "Bangkok",
    "Milan",
    "Weil am Rhein",
    "New York",
    "Porto",
    "Los Angeles",
    "Teshima",
    "Naoshima",
    "Paris",
  ];
  const people = [
    "Alex Morgan",
    "Maya Chen",
    "Sam Rivera",
    "Noor Patel",
    "Jules Martin",
    "Luca Rossi",
  ];
  const labels = [
    "Architecture",
    "Bookstore",
    "Museum",
    "Garden",
    "Gallery",
    "Restaurant",
    "Coffee",
    "Design",
    "Art",
    "Hotel",
    "Landscape",
    "Shop",
    "Park",
    "Bar",
    "Culture",
    "Weekend",
  ];
  const data = {
    city: cities.map((name, i) => ({
      id: `city-${i + 1}`,
      name,
      country: [
        "Mexico",
        "UK",
        "Denmark",
        "Thailand",
        "Italy",
        "Germany",
        "USA",
        "Portugal",
        "USA",
        "Japan",
        "Japan",
        "France",
      ][i],
    })),
    person: people.map((name, i) => ({
      id: `person-${i + 1}`,
      name,
      email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      bio: "Always looking for somewhere new.",
      avatar: "",
    })),
    place: names.map((name, i) => ({
      id: `place-${i + 1}`,
      name,
      description: [
        "A place worth slowing down for.",
        "Saved for the next trip.",
        "A recommendation from a friend.",
      ][Math.floor(random() * 3)],
      address: `${10 + i} ${["Museum Road", "Garden Street", "High Street"][i % 3]}`,
      latitude: 20 + random() * 30,
      longitude: random() * 100,
      website: "",
      phone: "",
      instagram: "",
      opening_hours: "Tuesday–Sunday, 10:00–18:00",
      status: "active",
      city_id: `city-${(i % 12) + 1}`,
    })),
    collection: [
      "Quiet architecture",
      "A weekend in London",
      "Art worth a journey",
      "Places to read",
      "Gardens & green spaces",
      "Next time in Japan",
    ].map((name, i) => ({
      id: `collection-${i + 1}`,
      name,
      description: "A few places to come back to.",
      visibility: i % 2 ? "private" : "shared",
      owner_id: `person-${(i % 6) + 1}`,
      place_ids: [`place-${i + 1}`, `place-${i + 7}`, `place-${i + 13}`],
      shared_with_ids: i % 2 ? [] : ["person-2"],
    })),
    visit: Array.from({ length: 12 }, (_, i) => ({
      id: `visit-${i + 1}`,
      name: `Visit ${names[i]}`,
      planned_date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      completed_date: "",
      status: ["planned", "completed", "cancelled"][i % 3],
      rating: i % 3 === 1 ? 4 : "",
      private_note: "",
      place_id: `place-${i + 1}`,
      person_id: `person-${(i % 6) + 1}`,
    })),
    note: Array.from({ length: 36 }, (_, i) => ({
      id: `note-${i + 1}`,
      body: [
        "Go early for the quietest rooms.",
        "Leave an afternoon to explore the neighbourhood.",
        "Recommended by Maya — look for the courtyard.",
      ][i % 3],
      place_id: i % 2 ? `place-${(i % 24) + 1}` : "",
      visit_id: i % 2 ? "" : `visit-${(i % 12) + 1}`,
      created_at: "2026-09-01",
    })),
    photo: Array.from({ length: 32 }, (_, i) => ({
      id: `photo-${i + 1}`,
      url: `https://example.com/photos/place-${i + 1}.jpg`,
      caption: `Reference photograph ${i + 1}`,
      taken_at: "2026-08-10",
      place_id: i % 2 ? `place-${(i % 24) + 1}` : "",
      visit_id: i % 2 ? "" : `visit-${(i % 12) + 1}`,
      person_id: `person-${(i % 6) + 1}`,
    })),
    tag: labels.map((name, i) => ({
      id: `tag-${i + 1}`,
      name,
      place_ids: [`place-${i + 1}`],
    })),
  };
  const tableNames = Object.fromEntries(
    specs.map(([key, , , alias]) => [key, condition === "clean" ? key : alias]),
  );
  for (const [key, label, plural, , fields, actions] of specs) {
    const table = tableNames[key];
    const columns = Object.entries(fields).map(([field, type]) => {
      const ref =
        typeof type === "string" && tableNames[type.replace("[]", "")];
      return `  ${field} ${type === "number" ? "REAL" : "TEXT"}${ref ? ` REFERENCES ${ref}(id)` : Array.isArray(type) ? ` CHECK (${field} IN (${type.map((x) => `'${x}'`).join(", ")}))` : ""}`;
    });
    await writeFile(
      path.join(destination, `database/schema/${table}.sql`),
      `CREATE TABLE ${table} (\n  id TEXT PRIMARY KEY,\n${columns.join(",\n")}\n);\n`,
    );
    await writeFile(
      path.join(destination, `src/pages/${key}.json`),
      JSON.stringify(
        { resource: key, table, label, plural, actions },
        null,
        2,
      ) + "\n",
    );
    await writeFile(
      path.join(destination, `src/models/${table}.json`),
      JSON.stringify({ resource: key, fields }, null, 2) + "\n",
    );
    await writeFile(
      path.join(destination, `src/validation/${key}.mjs`),
      `export function validate(record) { if (!String(record.${key === "note" ? "body" : key === "photo" ? "url" : "name"} || '').trim()) throw new Error('A ${key === "note" ? "body" : key === "photo" ? "URL" : "name"} is required.'); return record; }\n`,
    );
    await writeFile(
      path.join(destination, `src/services/${key}.mjs`),
      `import { validate } from '../validation/${key}.mjs';\nexport const storageTable = '${table}';\nexport function prepare(record) { return validate(record); }\n`,
    );
  }
  if (condition !== "clean") {
    for (const table of [
      "collection_item",
      "place_tag",
      "share_token",
      "photo_upload",
      "user_preference",
      "place_metadata",
      "session",
      "audit_entry",
    ])
      await writeFile(
        path.join(destination, `database/schema/${table}.sql`),
        `CREATE TABLE ${table} (\n  id TEXT PRIMARY KEY,\n  value TEXT,\n  created_at TEXT\n);\n`,
      );
  }
  if (condition === "messy") {
    await writeFile(
      path.join(destination, "src/services/legacy-locations.mjs"),
      "// Legacy import retained for migration. The old address fields are not used by the form.\nexport const legacyFields = ['street_address', 'address_line', 'location_name'];\n",
    );
    await writeFile(
      path.join(destination, "database/schema/legacy_place.sql"),
      "CREATE TABLE legacy_place (\n  id TEXT PRIMARY KEY,\n  name TEXT,\n  old_address TEXT\n);\n",
    );
    data.place[0].street_address = data.place[0].address;
  }
  await writeFile(
    path.join(destination, "database/seed/data.json"),
    JSON.stringify(data, null, 2) + "\n",
  );
  await writeFile(
    path.join(destination, "package.json"),
    JSON.stringify(
      {
        name: "atlas",
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: { start: "node server.mjs" },
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    path.join(destination, "README.md"),
    `# Atlas\n\nA disposable place-collection application. Run \`npm start\` and open http://127.0.0.1:4318. Node 22+; no dependencies.\n\nGenerated with condition \`${condition}\` and seed \`${seed}\`. Data is persisted in database/data.json; the original seed remains in database/seed/data.json.\n`,
  );
  await copyFile(
    path.join(here, "templates/server.mjs"),
    path.join(destination, "server.mjs"),
  );
  await copyFile(
    path.join(here, "templates/app.html"),
    path.join(destination, "public/index.html"),
  );
  return destination;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2),
    option = (name, fallback) =>
      args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  try {
    console.log(
      await generate(path.resolve(args[0] || "examples/atlas"), {
        condition: option("--condition", "realistic"),
        seed: Number(option("--seed", 42)),
      }),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
