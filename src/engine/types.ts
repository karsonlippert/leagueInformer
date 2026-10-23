export type Tier = "S" | "A" | "B" | "C" | "D";
export type Rarity = "silver" | "gold" | "prismatic";

/** Tier steps, lowest to highest. A score of 0 is D, 4 is S. */
export const TIER_ORDER: Tier[] = ["D", "C", "B", "A", "S"];

export interface Augment {
  id: string;
  name: string;
  rarity: Rarity;
  /** Hand-authored tier with no build context. Never derived from win rates. */
  baseTier: Tier;
  /** Effect vocabulary shared with items and champions, e.g. "on-hit". */
  tags: string[];
  setId?: string;
  /** Per-champion adjustments in tier steps, for ability augments. */
  championDeltas?: Record<string, number>;
  note?: string;
}

export interface Item {
  id: string;
  name: string;
  tags: string[];
}

export interface Champion {
  id: string;
  name: string;
  tags: string[];
}

export interface AugmentSet {
  id: string;
  name: string;
}

/** Everything the player already has. */
export interface BuildContext {
  championId: string | null;
  itemIds: string[];
  takenAugmentIds: string[];
}

/**
 * A synergy rule. Every populated `when` field must match for the rule to fire.
 * `delta` is in tier steps and may be negative.
 */
export interface Rule {
  id: string;
  explanation: string;
  delta: number;
  when: {
    /** Offered augment has at least one of these tags. */
    augmentHasAnyTag?: string[];
    /** Count of owned items carrying `tag` must reach `min`. */
    itemTagCount?: { tag: string; min: number };
    /** Any one of these specific items is owned. */
    itemIdsAny?: string[];
    /** Champion carries at least one of these tags. */
    championHasAnyTag?: string[];
    /** Count of taken augments carrying `tag` must reach `min`. */
    takenAugmentTagCount?: { tag: string; min: number };
  };
}

export interface Adjustment {
  source: "rule" | "set" | "champion" | "duplicate";
  label: string;
  delta: number;
}

export interface ScoredAugment {
  augment: Augment;
  baseTier: Tier;
  adjustedTier: Tier;
  /** Unrounded score in tier steps, used for ordering ties. */
  score: number;
  adjustments: Adjustment[];
  /** True when this augment is already taken and cannot be picked again. */
  unavailable: boolean;
}
