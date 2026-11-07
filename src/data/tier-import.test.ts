import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalog } from "./build-catalog.ts";
import { matchTiers, normalizeName, parseTierFile } from "./tier-import.ts";
import type { GeneratedAugment, GeneratedChampion, TierFile } from "./types.ts";

const augments: GeneratedAugment[] = [
  { id: "1", name: "Mad Scientist", rarity: "prismatic", iconUrl: "" },
  { id: "2", name: "Wee Woo Wee Woo", rarity: "gold", iconUrl: "" },
  { id: "3", name: "Icathia's Fall", rarity: "prismatic", iconUrl: "" },
  { id: "4", name: "Icathia's Fall", rarity: "prismatic", iconUrl: "" },
  { id: "5", name: "Twin", rarity: "silver", iconUrl: "" },
  { id: "6", name: "Twin", rarity: "gold", iconUrl: "" },
];
const champions: GeneratedChampion[] = [
  { id: "Zaahen", name: "Zaahen", sourceTags: [], iconUrl: "" },
  { id: "Kaisa", name: "Kai'Sa", sourceTags: [], iconUrl: "" },
];
const file = (champs: TierFile["champions"]): TierFile => ({ source: "test", champions: champs });

describe("normalizeName", () => {
  it("ignores case, spaces and punctuation", () => {
    assert.equal(normalizeName("Kai'Sa"), normalizeName("KAISA"));
    assert.equal(normalizeName("Icathia’s Fall"), "icathiasfall");
  });
});

describe("parseTierFile", () => {
  it("requires a source", () => {
    assert.throws(() => parseTierFile({ champions: {} }), /source/);
  });
  it("rejects unknown rarities and tiers", () => {
    assert.throws(() => parseTierFile({ source: "x", champions: { Z: { rare: {} } } }), /unknown rarity "rare"/);
    assert.throws(() => parseTierFile({ source: "x", champions: { Z: { gold: { Q: [] } } } }), /unknown tier "Q"/);
  });
  it("accepts a ranking that lists only some tiers", () => {
    const parsed = parseTierFile({ source: "x", champions: { Zaahen: { prismatic: { S: ["Mad Scientist"] } } } });
    assert.deepEqual(parsed.champions.Zaahen.prismatic, { S: ["Mad Scientist"] });
  });
});

describe("matchTiers", () => {
  it("maps names to ids and champions by id or display name", () => {
    const { championTiers, report } = matchTiers(
      file({ Zaahen: { prismatic: { S: ["mad scientist"] } }, "Kai'Sa": { gold: { B: ["Wee Woo Wee Woo"] } } }),
      augments,
      champions,
    );
    assert.deepEqual(championTiers, { "1": { Zaahen: "S" }, "2": { Kaisa: "B" } });
    assert.equal(report.entries, 2);
    assert.equal(report.championsMatched, 2);
  });

  it("reports unknown champions and augment names instead of guessing", () => {
    const { report } = matchTiers(
      file({ Nobody: { gold: { A: ["Wee Woo Wee Woo"] } }, Zaahen: { gold: { A: ["Not An Augment"] } } }),
      augments,
      champions,
    );
    assert.deepEqual(report.unmatchedChampions, ["Nobody"]);
    assert.deepEqual(report.unmatchedAugments, ["Not An Augment"]);
    assert.equal(report.entries, 0);
  });

  it("applies a tier to every id sharing a name and says so", () => {
    const { championTiers, report } = matchTiers(file({ Zaahen: { prismatic: { A: ["Icathia's Fall"] } } }), augments, champions);
    assert.deepEqual(championTiers, { "3": { Zaahen: "A" }, "4": { Zaahen: "A" } });
    assert.deepEqual(report.ambiguous, ["Icathia's Fall"]);
  });

  it("uses the rarity bucket to pick between same-named augments", () => {
    const { championTiers, report } = matchTiers(file({ Zaahen: { gold: { S: ["Twin"] } } }), augments, champions);
    assert.deepEqual(championTiers, { "6": { Zaahen: "S" } });
    assert.deepEqual(report.ambiguous, []);
  });

  it("flags an augment listed under a different rarity", () => {
    const { report } = matchTiers(file({ Zaahen: { gold: { A: ["Mad Scientist"] } } }), augments, champions);
    assert.match(report.rarityMismatches[0], /data says prismatic, file says gold/);
  });

  it("keeps the higher tier when an augment is listed twice", () => {
    const { championTiers, report } = matchTiers(
      file({ Zaahen: { prismatic: { B: ["Mad Scientist"], S: ["Mad Scientist"] } } }),
      augments,
      champions,
    );
    assert.equal(championTiers["1"].Zaahen, "S");
    assert.equal(report.conflicts.length, 1);
  });
});

describe("buildCatalog with outside champion tiers", () => {
  const generated = {
    augments,
    items: [],
    champions,
  };
  const base = { generated, authored: { augments: {}, items: {}, champions: {} }, sets: [], rules: [] };

  it("includes an augment that only has outside tiers, at the unlisted base tier", () => {
    const { catalog, coverage } = buildCatalog({ ...base, championTiers: { "1": { Zaahen: "S" } } });
    assert.deepEqual(catalog.augments.map((a) => [a.id, a.baseTier, a.championTiers]), [["1", "C", { Zaahen: "S" }]]);
    assert.equal(coverage.rated, 1);
  });

  it("lets hand-written champion tiers win over outside ones", () => {
    const { catalog } = buildCatalog({
      ...base,
      authored: { ...base.authored, augments: { "1": { baseTier: "B", tags: ["health"], championTiers: { Zaahen: "D" } } } },
      championTiers: { "1": { Zaahen: "S", Kaisa: "A" } },
    });
    assert.deepEqual(catalog.augments[0].championTiers, { Zaahen: "D", Kaisa: "A" });
    assert.equal(catalog.augments[0].baseTier, "B");
  });

  it("honours a different unlisted tier", () => {
    const { catalog } = buildCatalog({ ...base, championTiers: { "1": { Zaahen: "S" } }, unlistedTier: "D" });
    assert.equal(catalog.augments[0].baseTier, "D");
  });
});
