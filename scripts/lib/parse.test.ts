import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cdragonUrl, looksLikeLocalizationKey, parseAugments, parseChampions, parseItems } from "./parse.ts";

const fixture = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../fixtures/${file}`, import.meta.url), "utf8"));

describe("looksLikeLocalizationKey", () => {
  it("flags key-shaped names and passes display names", () => {
    assert.equal(looksLikeLocalizationKey("Augment_Foo_Name"), true);
    assert.equal(looksLikeLocalizationKey("Blade Waltz"), false);
    assert.equal(looksLikeLocalizationKey("Goliath"), false);
  });
});

describe("cdragonUrl", () => {
  it("maps a client asset path to a lowercase CommunityDragon URL", () => {
    assert.equal(
      cdragonUrl("/lol-game-data/assets/ASSETS/UX/Kiwi/Icon_Small.png"),
      "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/ux/kiwi/icon_small.png",
    );
  });
});

describe("parseAugments", () => {
  const report = parseAugments(fixture("cherry-augments.json"));

  it("keeps only Mayhem (Kiwi) augments", () => {
    assert.deepEqual(report.entries.map((a) => a.id), ["2001", "2002", "2003", "2004"]);
    assert.equal(report.skipped["not a Mayhem augment"], 1);
  });
  it("maps rarity codes and drops unknown ones with a reason", () => {
    assert.deepEqual(report.entries.map((a) => a.rarity), ["silver", "gold", "prismatic", "gold"]);
    assert.equal(Object.keys(report.skipped).filter((k) => k.startsWith("unknown rarity")).length, 1);
  });
  it("falls back to the large icon path when there is no small one", () => {
    assert.match(report.entries[2].iconUrl, /fixtureprismatic_large\.png$/);
  });
  it("warns when names look like localisation keys", () => {
    assert.equal(report.warnings.length, 1);
    assert.match(report.warnings[0], /localisation keys/);
  });
  it("rejects a feed that is not an array", () => {
    assert.throws(() => parseAugments({}), /top-level array/);
  });
});

describe("parseItems", () => {
  const report = parseItems(fixture("item.json"), "99.1.1");

  it("keeps purchasable, non-consumable Howling Abyss items", () => {
    assert.deepEqual(report.entries.map((i) => i.id), ["3084"]);
    assert.deepEqual(report.skipped, {
      "not available on Howling Abyss": 1,
      consumable: 1,
      "not purchasable": 1,
    });
  });
  it("keeps Riot's tags and builds the icon URL from the version", () => {
    assert.deepEqual(report.entries[0].sourceTags, ["Health", "OnHit"]);
    assert.equal(report.entries[0].iconUrl, "https://ddragon.leagueoflegends.com/cdn/99.1.1/img/item/3084.png");
  });
});

describe("parseChampions", () => {
  const report = parseChampions(fixture("champion.json"), "99.1.1");

  it("lowercases class tags and skips malformed entries", () => {
    assert.deepEqual(report.entries.map((c) => [c.id, c.sourceTags]), [
      ["Lux", ["mage", "support"]],
      ["Zed", ["assassin", "fighter"]],
    ]);
    assert.equal(report.skipped["missing id or name"], 1);
  });
});
