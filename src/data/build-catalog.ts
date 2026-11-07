import type { Catalog } from "../engine/scoring.ts";
import type { AugmentSet, Rule, Tier } from "../engine/types.ts";
import type {
  AuthoredAugment,
  AuthoredChampion,
  AuthoredItem,
  ChampionTierMap,
  GeneratedAugment,
  GeneratedChampion,
  GeneratedItem,
} from "./types.ts";
import { augmentCoverage, type Coverage } from "./validate.ts";

export interface BuildInput {
  generated: {
    augments: GeneratedAugment[];
    items: GeneratedItem[];
    champions: GeneratedChampion[];
  };
  authored: {
    augments: Record<string, AuthoredAugment>;
    items: Record<string, AuthoredItem>;
    champions: Record<string, AuthoredChampion>;
  };
  sets: AugmentSet[];
  rules: Rule[];
  /** Per-champion tiers from an outside ranking, keyed by augment id then champion id. */
  championTiers?: ChampionTierMap;
  /**
   * Base tier for an augment that has champion tiers but no authored entry. Rankings that
   * list only the top tiers leave everything else unlisted; this is the assumed tier then.
   */
  unlistedTier?: Tier;
}

export interface BuildResult {
  catalog: Catalog;
  coverage: Coverage;
}

/**
 * Join imported Riot data with hand-written judgment. An augment with no authored entry is
 * left out of the catalog rather than given an invented tier; `coverage.unratedIds` lists them.
 */
export function buildCatalog(input: BuildInput): BuildResult {
  const { generated, authored } = input;

  const outside = input.championTiers ?? {};
  const augments = generated.augments.flatMap((g) => {
    const mine = authored.augments[g.id];
    const ranked = outside[g.id];
    if (!mine && !ranked) return [];
    const entry = {
      id: g.id,
      name: g.name,
      rarity: g.rarity,
      baseTier: input.unlistedTier ?? "C",
      tags: [] as string[],
      ...mine,
    };
    // Hand-written champion tiers win over tiers from an outside ranking.
    return [ranked ? { ...entry, championTiers: { ...ranked, ...mine?.championTiers } } : entry];
  });

  const items = generated.items.map((g) => ({
    id: g.id,
    name: g.name,
    tags: authored.items[g.id]?.tags ?? [],
  }));

  const champions = generated.champions.map((g) => ({
    id: g.id,
    name: g.name,
    tags: [...new Set([...g.sourceTags, ...(authored.champions[g.id]?.tags ?? [])])],
  }));

  return {
    catalog: { augments, items, champions, sets: input.sets, rules: input.rules },
    coverage: augmentCoverage(
      generated.augments.map((a) => a.id),
      [...new Set([...Object.keys(authored.augments), ...Object.keys(outside)])],
    ),
  };
}
