import type { Rarity, Tier } from "../engine/types.ts";

/** Fields copied from Riot's feeds. Never hand-edited; `npm run import-data` rewrites them. */
export interface GeneratedAugment {
  id: string;
  name: string;
  rarity: Rarity;
  iconUrl: string;
}

export interface GeneratedItem {
  id: string;
  name: string;
  /** Riot's own tags, kept for reference. Our effect tags live in the authored layer. */
  sourceTags: string[];
  iconUrl: string;
}

export interface GeneratedChampion {
  id: string;
  name: string;
  sourceTags: string[];
  iconUrl: string;
}

export interface GeneratedMeta {
  ddragonVersion: string;
  importedAt: string;
  augmentCount: number;
  itemCount: number;
  championCount: number;
}

/** Hand-written judgment about an imported augment, keyed by augment id. */
export interface AuthoredAugment {
  baseTier: Tier;
  tags: string[];
  setId?: string;
  note?: string;
  championTiers?: Record<string, Tier>;
}

export interface AuthoredItem {
  tags: string[];
}

export interface AuthoredChampion {
  /** Extra tags added on top of Riot's own class tags. */
  tags: string[];
}

/** augment id -> champion id -> tier. */
export type ChampionTierMap = Record<string, Record<string, Tier>>;

/**
 * Tier rankings from an outside source, laid out like a ranking page: per champion, then
 * rarity, then tier, then augment names. Tiers a source does not list are simply absent.
 */
export interface TierFile {
  /** Where the rankings came from. Required so provenance is never lost. */
  source: string;
  patch?: string;
  champions: Record<string, Partial<Record<Rarity, Partial<Record<Tier, string[]>>>>>;
}

/** An imported augment the Mayhem filter discarded, kept so the filter can be checked. */
export interface RejectedAugment {
  id: string;
  name: string;
  rarity: string;
  iconPath: string;
}
