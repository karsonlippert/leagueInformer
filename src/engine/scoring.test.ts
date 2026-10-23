import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { rankOffers, scoreAugment, scoreToTier, type Catalog } from "./scoring.ts";
import type { BuildContext } from "./types.ts";

const load = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8")) as T;

const catalog: Catalog = {
  augments: load("augments.sample.json"),
  items: load("items.sample.json"),
  champions: load("champions.sample.json"),
  sets: load("sets.sample.json"),
  rules: load("rules.json"),
};

const empty: BuildContext = { championId: null, itemIds: [], takenAugmentIds: [] };
const augment = (id: string) => catalog.augments.find((a) => a.id === id)!;

describe("scoreToTier", () => {
  it("clamps to the S and D ends", () => {
    assert.equal(scoreToTier(99), "S");
    assert.equal(scoreToTier(-5), "D");
  });
  it("rounds to the nearest tier", () => {
    assert.equal(scoreToTier(2.4), "B");
    assert.equal(scoreToTier(2.6), "A");
  });
});

describe("scoreAugment", () => {
  it("returns the base tier with no context", () => {
    const result = scoreAugment(augment("sample-ability-onhit"), empty, catalog);
    assert.equal(result.baseTier, "C");
    assert.equal(result.adjustedTier, "C");
    assert.deepEqual(result.adjustments, []);
  });

  it("lifts an on-hit applier from C to S with Heartsteel plus on-hit items", () => {
    const context: BuildContext = {
      championId: null,
      itemIds: ["heartsteel", "blade-of-the-ruined-king"],
      takenAugmentIds: [],
    };
    const result = scoreAugment(augment("sample-ability-onhit"), context, catalog);
    assert.equal(result.baseTier, "C");
    assert.equal(result.adjustedTier, "S");
    assert.ok(result.adjustments.length >= 2, "explains why it moved");
  });

  it("gives a smaller lift with a single on-hit item", () => {
    const context: BuildContext = { ...empty, itemIds: ["kraken-slayer"] };
    const result = scoreAugment(augment("sample-ability-onhit"), context, catalog);
    assert.equal(result.adjustedTier, "B");
  });

  it("does not boost an unrelated augment", () => {
    const context: BuildContext = { ...empty, itemIds: ["heartsteel"] };
    const result = scoreAugment(augment("sample-ap-burst"), context, catalog);
    assert.equal(result.adjustedTier, result.baseTier);
  });

  it("adds a capped set bonus for already-taken set pieces", () => {
    const one = scoreAugment(
      augment("sample-set-a2"),
      { ...empty, takenAugmentIds: ["sample-set-a1"] },
      catalog,
    );
    assert.equal(one.score, 1.75);
    const two = scoreAugment(
      augment("sample-set-a3"),
      { ...empty, takenAugmentIds: ["sample-set-a1", "sample-set-a2"] },
      catalog,
    );
    assert.equal(two.score, 2 + 1.5);
  });

  it("flags an already-taken augment as unavailable", () => {
    const result = scoreAugment(
      augment("sample-bonus-hp"),
      { ...empty, takenAugmentIds: ["sample-bonus-hp"] },
      catalog,
    );
    assert.equal(result.unavailable, true);
  });
});

describe("rankOffers", () => {
  it("orders offers by adjusted score and sinks unavailable ones", () => {
    const context: BuildContext = {
      championId: null,
      itemIds: ["heartsteel", "kraken-slayer"],
      takenAugmentIds: ["sample-bonus-hp"],
    };
    const ranked = rankOffers(
      ["sample-bonus-hp", "sample-ap-burst", "sample-ability-onhit"],
      context,
      catalog,
    );
    assert.equal(ranked[0].augment.id, "sample-ability-onhit");
    assert.equal(ranked[ranked.length - 1].augment.id, "sample-bonus-hp");
  });

  it("ignores unknown offer ids", () => {
    assert.deepEqual(rankOffers(["nope"], empty, catalog), []);
  });
});
