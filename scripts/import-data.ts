/**
 * Download Riot's augment, item and champion data and write it to src/data/generated.
 *
 *   npm run import-data
 *   npm run import-data -- --fixtures scripts/fixtures --out /tmp/out   (offline, no network)
 *
 * Nothing is written unless every input downloads and parses, and at least one Mayhem augment
 * is found.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { GeneratedMeta } from "../src/data/types.ts";
import { CDRAGON_BASE, DDRAGON_BASE, parseAugments, parseChampions, parseItems } from "./lib/parse.ts";

const { values: args } = parseArgs({
  options: {
    fixtures: { type: "string" },
    out: { type: "string", default: "src/data/generated" },
  },
});

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function load(): Promise<{ version: string; augments: unknown; champions: unknown; items: unknown }> {
  if (args.fixtures) {
    const read = (file: string): unknown => JSON.parse(readFileSync(join(args.fixtures!, file), "utf8"));
    const versions = read("versions.json") as string[];
    return {
      version: versions[0],
      augments: read("cherry-augments.json"),
      champions: read("champion.json"),
      items: read("item.json"),
    };
  }
  const versions = (await getJson(`${DDRAGON_BASE.replace("/cdn/", "/api/")}versions.json`)) as string[];
  const version = versions[0];
  const [augments, champions, items] = await Promise.all([
    getJson(`${CDRAGON_BASE}v1/cherry-augments.json`),
    getJson(`${DDRAGON_BASE}${version}/data/en_US/champion.json`),
    getJson(`${DDRAGON_BASE}${version}/data/en_US/item.json`),
  ]);
  return { version, augments, champions, items };
}

function describeSkips(label: string, skipped: Record<string, number>): void {
  const parts = Object.entries(skipped).map(([reason, count]) => `${count} ${reason}`);
  if (parts.length > 0) console.log(`  ${label} skipped: ${parts.join(", ")}`);
}

const input = await load();
const augments = parseAugments(input.augments);
const items = parseItems(input.items, input.version);
const champions = parseChampions(input.champions, input.version);

console.log(`Data Dragon version ${input.version}`);
console.log(`  augments (Mayhem): ${augments.entries.length}`);
console.log(`  items (Howling Abyss): ${items.entries.length}`);
console.log(`  champions: ${champions.entries.length}`);
describeSkips("augments", augments.skipped);
describeSkips("items", items.skipped);
describeSkips("champions", champions.skipped);
for (const warning of [...augments.warnings, ...items.warnings, ...champions.warnings]) {
  console.warn(`WARNING: ${warning}`);
}

if (augments.entries.length === 0 || items.entries.length === 0 || champions.entries.length === 0) {
  const sample = Array.isArray(input.augments) ? JSON.stringify(input.augments[0]) : "(not an array)";
  console.error(
    "\nNothing was written: a feed produced zero entries, so its format has probably changed.\n" +
      `First raw augment entry: ${sample}`,
  );
  process.exit(1);
}

const meta: GeneratedMeta = {
  ddragonVersion: input.version,
  importedAt: new Date().toISOString(),
  augmentCount: augments.entries.length,
  itemCount: items.entries.length,
  championCount: champions.entries.length,
};

const out = args.out!;
mkdirSync(out, { recursive: true });
const write = (file: string, data: unknown) =>
  writeFileSync(join(out, file), JSON.stringify(data, null, 2) + "\n");
write("augments.json", augments.entries);
write("items.json", items.entries);
write("champions.json", champions.entries);
write("meta.json", meta);
console.log(`\nWrote 4 files to ${out}`);
