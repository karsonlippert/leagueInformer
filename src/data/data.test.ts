import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Catalog } from "../engine/scoring.ts";
import { buildCatalog } from "./build-catalog.ts";
import { augmentCoverage, validateCatalog, type TagVocabulary } from "./validate.ts";

const load = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8")) as T;

const vocabulary = load<TagVocabulary>("tags.json");
const shipped = (): Catalog => ({
  augments: load("augments.sample.json"),
  items: load("items.sample.json"),
  champions: load("champions.sample.json"),
  sets: load("sets.sample.json"),
  rules: load("rules.json"),
});
const messages = (catalog: Catalog) => validateCatalog(catalog, vocabulary).map((i) => i.message);

describe("validateCatalog", () => {
  it("accepts the shipped sample data", () => {
    assert.deepEqual(messages(shipped()), []);
  });

  it("flags an unknown tag on an augment", () => {
    const catalog = shipped();
    catalog.augments[0].tags.push("on-hitt");
    assert.match(messages(catalog)[0], /unknown tag "on-hitt"/);
  });

  it("flags a rule that names an item that does not exist", () => {
    const catalog = shipped();
    catalog.rules[1].when.itemIdsAny = ["not-an-item"];
    assert.match(messages(catalog).join("\n"), /unknown item "not-an-item"/);
  });

  it("flags an unknown set, duplicate ids and an empty rule condition", () => {
    const catalog = shipped();
    catalog.augments[0].setId = "no-such-set";
    catalog.augments.push({ ...catalog.augments[1] });
    catalog.rules.push({ id: "empty", explanation: "matches everything", delta: 1, when: {} });
    const text = messages(catalog).join("\n");
    assert.match(text, /unknown setId "no-such-set"/);
    assert.match(text, /duplicate augment id/);
    assert.match(text, /empty "when"/);
  });

  it("warns when a rule names an item that has same-name variants", () => {
    const catalog = shipped();
    catalog.items.push({ id: "heartsteel-empowered", name: "Heartsteel", tags: ["health"] });
    const issues = validateCatalog(catalog, vocabulary);
    assert.equal(issues.filter((i) => i.level === "error").length, 0);
    assert.match(issues.map((i) => i.message).join("\n"), /shares its name with heartsteel-empowered/);
  });

  it("flags championDeltas for an unknown champion", () => {
    const catalog = shipped();
    catalog.augments[0].championDeltas = { Nobody: 1 };
    assert.match(messages(catalog).join("\n"), /unknown champion "Nobody"/);
  });
});

describe("augmentCoverage", () => {
  it("reports unrated and orphaned ids", () => {
    const coverage = augmentCoverage(["1", "2", "3"], ["2", "9"]);
    assert.deepEqual(coverage, { total: 3, rated: 1, unratedIds: ["1", "3"], orphanedIds: ["9"] });
  });
});

describe("buildCatalog", () => {
  const generated = {
    augments: [
      { id: "1", name: "Rated", rarity: "gold" as const, iconUrl: "u1" },
      { id: "2", name: "Not yet rated", rarity: "silver" as const, iconUrl: "u2" },
    ],
    items: [{ id: "10", name: "Item", sourceTags: ["OnHit"], iconUrl: "i" }],
    champions: [{ id: "Zed", name: "Zed", sourceTags: ["assassin"], iconUrl: "c" }],
  };
  const authored = {
    augments: { "1": { baseTier: "A" as const, tags: ["health"] } },
    items: { "10": { tags: ["on-hit"] } },
    champions: { Zed: { tags: ["fighter", "assassin"] } },
  };
  const result = buildCatalog({ generated, authored, sets: [], rules: [] });

  it("joins Riot fields with authored judgment", () => {
    assert.deepEqual(result.catalog.augments, [
      { id: "1", name: "Rated", rarity: "gold", baseTier: "A", tags: ["health"] },
    ]);
    assert.deepEqual(result.catalog.items[0].tags, ["on-hit"]);
  });
  it("leaves unrated augments out instead of inventing a tier, and reports them", () => {
    assert.deepEqual(result.coverage.unratedIds, ["2"]);
  });
  it("merges Riot class tags with authored champion tags without duplicates", () => {
    assert.deepEqual(result.catalog.champions[0].tags, ["assassin", "fighter"]);
  });
  it("gives items no tags until they are authored", () => {
    const bare = buildCatalog({ generated, authored: { ...authored, items: {} }, sets: [], rules: [] });
    assert.deepEqual(bare.catalog.items[0].tags, []);
  });
});
