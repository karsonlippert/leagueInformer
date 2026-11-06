import type { Catalog } from "../engine/scoring.ts";
import type { AugmentSet, Rule } from "../engine/types.ts";
import type {
  AuthoredAugment,
  AuthoredChampion,
  AuthoredItem,
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

  const augments = generated.augments.flatMap((g) => {
    const mine = authored.augments[g.id];
    if (!mine) return [];
    return [{ id: g.id, name: g.name, rarity: g.rarity, ...mine }];
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
      Object.keys(authored.augments),
    ),
  };
}
