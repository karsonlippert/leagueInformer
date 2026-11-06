import type { Rarity } from "../../src/engine/types.ts";
import type {
  GeneratedAugment,
  GeneratedChampion,
  GeneratedItem,
} from "../../src/data/types.ts";

export const CDRAGON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/";
export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com/cdn/";

/** Howling Abyss, the map ARAM Mayhem is played on. */
const HOWLING_ABYSS_MAP = "12";

const RARITY_BY_CODE: Record<string, Rarity> = {
  ksilver: "silver",
  kgold: "gold",
  kprismatic: "prismatic",
};

export interface ParseReport<T> {
  entries: T[];
  /** Counts of input entries that were dropped, by reason. */
  skipped: Record<string, number>;
  warnings: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const bump = (counts: Record<string, number>, reason: string) => {
  counts[reason] = (counts[reason] ?? 0) + 1;
};

/** A localisation key such as "Augment_Foo_Name" rather than text meant for people. */
export function looksLikeLocalizationKey(name: string): boolean {
  return !/\s/.test(name) && /[_./]/.test(name);
}

/** Convert a client asset path to the matching CommunityDragon URL. */
export function cdragonUrl(assetPath: string): string {
  const stripped = assetPath.replace(/^\/lol-game-data\/assets\//i, "");
  return CDRAGON_BASE + stripped.toLowerCase();
}

/**
 * Parse cherry-augments.json. That file mixes Arena and Mayhem augments; Mayhem entries are
 * the ones whose icon path sits under a "Kiwi" folder.
 */
export function parseAugments(raw: unknown): ParseReport<GeneratedAugment> {
  const skipped: Record<string, number> = {};
  const warnings: string[] = [];
  const entries: GeneratedAugment[] = [];

  if (!Array.isArray(raw)) {
    throw new Error("cherry-augments.json: expected a top-level array");
  }

  let keyLikeNames = 0;
  for (const item of raw) {
    if (!isObject(item)) {
      bump(skipped, "not an object");
      continue;
    }
    const iconPath = asString(item.augmentSmallIconPath) ?? asString(item.augmentIconPath);
    if (!iconPath || !/\/kiwi\//i.test(iconPath)) {
      bump(skipped, "not a Mayhem augment");
      continue;
    }
    const id = item.id === undefined || item.id === null ? undefined : String(item.id);
    const name = asString(item.nameTRA) ?? asString(item.name);
    if (!id || !name) {
      bump(skipped, "missing id or name");
      continue;
    }
    const rarity = RARITY_BY_CODE[String(item.rarity ?? "").toLowerCase()];
    if (!rarity) {
      bump(skipped, `unknown rarity ${JSON.stringify(item.rarity)}`);
      continue;
    }
    if (looksLikeLocalizationKey(name)) keyLikeNames++;
    entries.push({ id, name, rarity, iconUrl: cdragonUrl(iconPath) });
  }

  if (keyLikeNames > 0) {
    warnings.push(
      `${keyLikeNames} augment name(s) look like localisation keys, not display names. ` +
        "Names probably need resolving through the string table.",
    );
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) warnings.push(`duplicate augment id ${entry.id}`);
    seen.add(entry.id);
  }
  const textless = entries.filter((e) => !/[\p{L}\p{N}]/u.test(e.name));
  if (textless.length > 0) {
    warnings.push(
      `${textless.length} augment name(s) contain no letters or digits (ids: ${textless.map((e) => e.id).join(", ")}).`,
    );
  }
  const idsByName = new Map<string, string[]>();
  for (const entry of entries) idsByName.set(entry.name, [...(idsByName.get(entry.name) ?? []), entry.id]);
  for (const [name, ids] of idsByName) {
    if (ids.length > 1) warnings.push(`augment name "${name}" is shared by ids ${ids.join(", ")}`);
  }

  entries.sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
  return { entries, skipped, warnings };
}

export function parseItems(raw: unknown, version: string): ParseReport<GeneratedItem> {
  const skipped: Record<string, number> = {};
  const entries: GeneratedItem[] = [];
  if (!isObject(raw) || !isObject(raw.data)) {
    throw new Error("item.json: expected an object with a `data` object");
  }
  for (const [id, value] of Object.entries(raw.data)) {
    if (!isObject(value)) {
      bump(skipped, "not an object");
      continue;
    }
    const maps = isObject(value.maps) ? value.maps : {};
    const gold = isObject(value.gold) ? value.gold : {};
    const name = asString(value.name);
    if (!name) {
      bump(skipped, "missing name");
    } else if (maps[HOWLING_ABYSS_MAP] !== true) {
      bump(skipped, "not available on Howling Abyss");
    } else if (gold.purchasable !== true || !(Number(gold.total) > 0)) {
      bump(skipped, "not purchasable");
    } else if (value.consumed === true) {
      bump(skipped, "consumable");
    } else {
      entries.push({
        id,
        name,
        sourceTags: Array.isArray(value.tags) ? value.tags.filter((t) => typeof t === "string") : [],
        iconUrl: `${DDRAGON_BASE}${version}/img/item/${id}.png`,
      });
    }
  }
  entries.sort((a, b) => Number(a.id) - Number(b.id));
  return { entries, skipped, warnings: [] };
}

export function parseChampions(raw: unknown, version: string): ParseReport<GeneratedChampion> {
  const skipped: Record<string, number> = {};
  const entries: GeneratedChampion[] = [];
  if (!isObject(raw) || !isObject(raw.data)) {
    throw new Error("champion.json: expected an object with a `data` object");
  }
  for (const value of Object.values(raw.data)) {
    if (!isObject(value)) {
      bump(skipped, "not an object");
      continue;
    }
    const id = asString(value.id);
    const name = asString(value.name);
    if (!id || !name) {
      bump(skipped, "missing id or name");
      continue;
    }
    const image = isObject(value.image) ? asString(value.image.full) : undefined;
    entries.push({
      id,
      name,
      sourceTags: Array.isArray(value.tags)
        ? value.tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase())
        : [],
      iconUrl: `${DDRAGON_BASE}${version}/img/champion/${image ?? `${id}.png`}`,
    });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return { entries, skipped, warnings: [] };
}
