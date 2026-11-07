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
