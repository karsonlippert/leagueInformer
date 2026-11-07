import { TIER_ORDER, type Rarity, type Tier } from "../engine/types.ts";
import type { ChampionTierMap, GeneratedAugment, GeneratedChampion, TierFile } from "./types.ts";

const RARITIES: Rarity[] = ["silver", "gold", "prismatic"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lowercase letters and digits only, so "Kai'Sa", "Kaisa" and "KAI SA" compare equal. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Check the shape of a tier file and return it typed, or throw saying what is wrong. */
export function parseTierFile(raw: unknown): TierFile {
  if (!isObject(raw)) throw new Error("tier file: expected a JSON object");
  if (typeof raw.source !== "string" || raw.source.trim() === "") {
    throw new Error('tier file: "source" must say where the rankings came from');
  }
  if (!isObject(raw.champions)) throw new Error('tier file: "champions" must be an object');
  for (const [champion, buckets] of Object.entries(raw.champions)) {
    if (!isObject(buckets)) throw new Error(`tier file: ${champion} must be an object of rarities`);
    for (const [rarity, tiers] of Object.entries(buckets)) {
      if (!RARITIES.includes(rarity as Rarity)) {
        throw new Error(`tier file: ${champion} has unknown rarity "${rarity}"`);
      }
      if (!isObject(tiers)) throw new Error(`tier file: ${champion}/${rarity} must be an object of tiers`);
      for (const [tier, names] of Object.entries(tiers)) {
        if (!TIER_ORDER.includes(tier as Tier)) {
          throw new Error(`tier file: ${champion}/${rarity} has unknown tier "${tier}"`);
        }
        if (!Array.isArray(names) || names.some((n) => typeof n !== "string")) {
          throw new Error(`tier file: ${champion}/${rarity}/${tier} must be a list of augment names`);
        }
      }
    }
  }
  return raw as unknown as TierFile;
}

export interface MatchReport {
  /** Champion and augment tier assignments produced. */
  entries: number;
  championsMatched: number;
  unmatchedChampions: string[];
  /** Augment names in the file that match no imported augment. */
  unmatchedAugments: string[];
  /** Names that map to several augment ids; the tier was applied to all of them. */
  ambiguous: string[];
  /** Augments listed under a different rarity than the imported data says. */
  rarityMismatches: string[];
  /** Augments listed under two tiers for one champion; the higher tier was kept. */
  conflicts: string[];
}

/** Resolve names in a tier file to imported augment and champion ids. */
export function matchTiers(
  file: TierFile,
  augments: GeneratedAugment[],
  champions: GeneratedChampion[],
): { championTiers: ChampionTierMap; report: MatchReport } {
  const augmentsByName = new Map<string, GeneratedAugment[]>();
  for (const augment of augments) {
    const key = normalizeName(augment.name);
    augmentsByName.set(key, [...(augmentsByName.get(key) ?? []), augment]);
  }
  const championsByKey = new Map<string, GeneratedChampion>();
  for (const champion of champions) {
    championsByKey.set(normalizeName(champion.id), champion);
    championsByKey.set(normalizeName(champion.name), champion);
  }

  const championTiers: ChampionTierMap = {};
  const unmatchedChampions: string[] = [];
  const unmatchedAugments = new Set<string>();
  const ambiguous = new Set<string>();
  const rarityMismatches = new Set<string>();
  const conflicts: string[] = [];
  let entries = 0;
  let championsMatched = 0;
  const highestFirst = [...TIER_ORDER].reverse();

  for (const [championKey, buckets] of Object.entries(file.champions)) {
    const champion = championsByKey.get(normalizeName(championKey));
    if (!champion) {
      unmatchedChampions.push(championKey);
      continue;
    }
    championsMatched++;
    for (const rarity of RARITIES) {
      for (const tier of highestFirst) {
        for (const name of buckets[rarity]?.[tier] ?? []) {
          const candidates = augmentsByName.get(normalizeName(name));
          if (!candidates) {
            unmatchedAugments.add(name);
            continue;
          }
          const sameRarity = candidates.filter((c) => c.rarity === rarity);
          const targets = sameRarity.length > 0 ? sameRarity : candidates;
          if (targets.length > 1) ambiguous.add(name);
          for (const target of targets) {
            if (target.rarity !== rarity) {
              rarityMismatches.add(`${name} (data says ${target.rarity}, file says ${rarity})`);
            }
            const existing = championTiers[target.id]?.[champion.id];
            if (existing) {
              if (existing !== tier) conflicts.push(`${champion.id}: ${name} listed as ${existing} and ${tier}`);
              continue;
            }
            (championTiers[target.id] ??= {})[champion.id] = tier;
            entries++;
          }
        }
      }
    }
  }

  return {
    championTiers,
    report: {
      entries,
      championsMatched,
      unmatchedChampions,
      unmatchedAugments: [...unmatchedAugments].sort(),
      ambiguous: [...ambiguous].sort(),
      rarityMismatches: [...rarityMismatches].sort(),
      conflicts,
    },
  };
}
