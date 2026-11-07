/**
 * Turn a tier-ranking file into per-champion tiers keyed by our augment and champion ids.
 *
 *   npm run import-tiers -- --file path/to/rankings.json
 *
 * The file format is described by `TierFile` in src/data/types.ts. Run `npm run import-data`
 * first so there are augments and champions to match against.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { matchTiers, parseTierFile } from "../src/data/tier-import.ts";

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    out: { type: "string", default: "src/data/tiers/champion-tiers.json" },
  },
});
if (!args.file) {
  console.error("Usage: npm run import-tiers -- --file <rankings.json> [--out <path>]");
  process.exit(2);
}

const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const file = parseTierFile(read(args.file));
const { championTiers, report } = matchTiers(
  file,
  read("src/data/generated/augments.json") as never,
  read("src/data/generated/champions.json") as never,
);

const show = (label: string, items: string[]) => {
  if (items.length === 0) return;
  const shown = items.slice(0, 25).join("; ");
  console.log(`${label} (${items.length}): ${shown}${items.length > 25 ? "; ..." : ""}`);
};
console.log(`Source: ${file.source}${file.patch ? `, patch ${file.patch}` : ""}`);
console.log(`Champions matched: ${report.championsMatched} of ${Object.keys(file.champions).length}`);
console.log(`Tier assignments: ${report.entries}`);
show("Champions not found", report.unmatchedChampions);
show("Augment names not found", report.unmatchedAugments);
show("Names shared by several ids", report.ambiguous);
show("Rarity disagreements", report.rarityMismatches);
show("Conflicting tiers", report.conflicts);

if (report.entries === 0) {
  console.error("\nNothing was written: no names in the file matched imported data.");
  process.exit(1);
}
mkdirSync(dirname(args.out!), { recursive: true });
writeFileSync(
  args.out!,
  JSON.stringify({ source: file.source, patch: file.patch ?? null, championTiers }, null, 2) + "\n",
);
console.log(`\nWrote ${args.out}`);
