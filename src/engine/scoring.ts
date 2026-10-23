import {
  TIER_ORDER,
  type Adjustment,
  type Augment,
  type AugmentSet,
  type BuildContext,
  type Champion,
  type Item,
  type Rule,
  type ScoredAugment,
  type Tier,
} from "./types.ts";

export interface Catalog {
  augments: Augment[];
  items: Item[];
  champions: Champion[];
  sets: AugmentSet[];
  rules: Rule[];
}

/** Bonus per already-taken augment from the same set, capped. */
export const SET_BONUS_PER_PIECE = 0.75;
export const SET_BONUS_CAP = 1.5;

const tierToScore = (tier: Tier): number => TIER_ORDER.indexOf(tier);

export function scoreToTier(score: number): Tier {
  const index = Math.min(TIER_ORDER.length - 1, Math.max(0, Math.round(score)));
  return TIER_ORDER[index];
}

function countTags<T extends { tags: string[] }>(owned: T[], tag: string): number {
  return owned.filter((entry) => entry.tags.includes(tag)).length;
}

export function scoreAugment(
  augment: Augment,
  context: BuildContext,
  catalog: Catalog,
): ScoredAugment {
  const items = context.itemIds
    .map((id) => catalog.items.find((item) => item.id === id))
    .filter((item): item is Item => item !== undefined);
  const taken = context.takenAugmentIds
    .map((id) => catalog.augments.find((entry) => entry.id === id))
    .filter((entry): entry is Augment => entry !== undefined);
  const champion = catalog.champions.find((c) => c.id === context.championId) ?? null;

  const unavailable = context.takenAugmentIds.includes(augment.id);
  const adjustments: Adjustment[] = [];

  if (unavailable) {
    adjustments.push({ source: "duplicate", label: "Already taken", delta: 0 });
  }

  for (const rule of catalog.rules) {
    const { when } = rule;
    if (when.augmentHasAnyTag && !when.augmentHasAnyTag.some((t) => augment.tags.includes(t))) {
      continue;
    }
    if (when.itemTagCount && countTags(items, when.itemTagCount.tag) < when.itemTagCount.min) {
      continue;
    }
    if (when.itemIdsAny && !when.itemIdsAny.some((id) => context.itemIds.includes(id))) {
      continue;
    }
    if (when.championHasAnyTag && !(champion && when.championHasAnyTag.some((t) => champion.tags.includes(t)))) {
      continue;
    }
    if (
      when.takenAugmentTagCount &&
      countTags(taken, when.takenAugmentTagCount.tag) < when.takenAugmentTagCount.min
    ) {
      continue;
    }
    adjustments.push({ source: "rule", label: rule.explanation, delta: rule.delta });
  }

  if (augment.setId) {
    const pieces = taken.filter((entry) => entry.setId === augment.setId).length;
    if (pieces > 0) {
      const setName = catalog.sets.find((s) => s.id === augment.setId)?.name ?? augment.setId;
      adjustments.push({
        source: "set",
        label: `Builds toward ${setName} set (${pieces} already taken)`,
        delta: Math.min(SET_BONUS_CAP, pieces * SET_BONUS_PER_PIECE),
      });
    }
  }

  const championDelta = champion && augment.championDeltas?.[champion.id];
  if (champion && championDelta) {
    adjustments.push({
      source: "champion",
      label: `${champion.name}-specific adjustment`,
      delta: championDelta,
    });
  }

  const score = tierToScore(augment.baseTier) + adjustments.reduce((sum, a) => sum + a.delta, 0);

  return {
    augment,
    baseTier: augment.baseTier,
    adjustedTier: scoreToTier(score),
    score,
    adjustments,
    unavailable,
  };
}

/** Score the offered augments and order them best first. Unavailable ones sink. */
export function rankOffers(
  offerIds: string[],
  context: BuildContext,
  catalog: Catalog,
): ScoredAugment[] {
  return offerIds
    .map((id) => catalog.augments.find((a) => a.id === id))
    .filter((a): a is Augment => a !== undefined)
    .map((a) => scoreAugment(a, context, catalog))
    .sort((a, b) => Number(a.unavailable) - Number(b.unavailable) || b.score - a.score);
}
