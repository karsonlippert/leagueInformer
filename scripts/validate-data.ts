/**
 * Validate the data the app currently ships, and report authoring coverage once imported
 * data exists.
 *
 *   npm run data:check
 */
import { existsSync, readFileSync } from "node:fs";
import type { Catalog } from "../src/engine/scoring.ts";
import { buildCatalog } from "../src/data/build-catalog.ts";
import { validateCatalog, type Issue, type TagVocabulary } from "../src/data/validate.ts";

const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const data = (file: string) => `src/data/${file}`;

const vocabulary = read<TagVocabulary>(data("tags.json"));
const issues: Issue[] = [];

// The catalog the app ships today (sample data until the real import is wired in).
const shipped: Catalog = {
  augments: read(data("augments.sample.json")),
  items: read(data("items.sample.json")),
  champions: read(data("champions.sample.json")),
  sets: read(data("sets.sample.json")),
  rules: read(data("rules.json")),
};
console.log(`Shipped catalog: ${shipped.augments.length} augments, ${shipped.items.length} items, ${shipped.champions.length} champions, ${shipped.rules.length} rules`);
issues.push(...validateCatalog(shipped, vocabulary));

// The imported catalog, if `npm run import-data` has been run.
if (existsSync(data("generated/meta.json"))) {
  const meta = read<{ ddragonVersion: string; importedAt: string }>(data("generated/meta.json"));
  const optional = <T>(path: string, fallback: T): T => (existsSync(path) ? read<T>(path) : fallback);
  const built = buildCatalog({
    generated: {
      augments: read(data("generated/augments.json")),
      items: read(data("generated/items.json")),
      champions: read(data("generated/champions.json")),
    },
    authored: {
      augments: optional(data("authored/augments.json"), {}),
      items: optional(data("authored/items.json"), {}),
      champions: optional(data("authored/champions.json"), {}),
    },
    championTiers: optional<{ championTiers: Record<string, Record<string, never>> }>(
      data("tiers/champion-tiers.json"),
      { championTiers: {} },
    ).championTiers as never,
    sets: optional(data("sets.json"), []),
    rules: shipped.rules,
  });
  const { coverage } = built;
  console.log(`\nImported data: Data Dragon ${meta.ddragonVersion}, imported ${meta.importedAt}`);
  console.log(`Augments rated: ${coverage.rated} of ${coverage.total}`);
  if (coverage.unratedIds.length > 0) {
    console.log(`  Unrated ids (first 20): ${coverage.unratedIds.slice(0, 20).join(", ")}`);
  }
  for (const id of coverage.orphanedIds) {
    issues.push({ level: "warning", message: `authored augment "${id}" is not in the import (removed or renumbered?)` });
  }
  // Rules name items by id, so check them against the real item list too. These are warnings
  // because the app does not ship the imported catalog yet.
  for (const issue of validateCatalog(built.catalog, vocabulary)) {
    issues.push({ level: "warning", message: `[imported] ${issue.message}` });
  }
}

for (const issue of issues) console.log(`${issue.level.toUpperCase()}: ${issue.message}`);
const errors = issues.filter((i) => i.level === "error").length;
console.log(errors === 0 ? "\nData check passed." : `\nData check failed with ${errors} error(s).`);
process.exit(errors === 0 ? 0 : 1);
