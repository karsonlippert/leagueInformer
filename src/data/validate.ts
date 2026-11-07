import type { Catalog } from "../engine/scoring.ts";
import { TIER_ORDER } from "../engine/types.ts";

export interface Issue {
  level: "error" | "warning";
  message: string;
}

export interface TagVocabulary {
  effects: { tag: string }[];
  archetypes: { tag: string }[];
}

export function vocabularyTags(vocabulary: TagVocabulary): Set<string> {
  return new Set([...vocabulary.effects, ...vocabulary.archetypes].map((entry) => entry.tag));
}

/** Check a catalog against the tag vocabulary and for dangling references. */
export function validateCatalog(catalog: Catalog, vocabulary: TagVocabulary): Issue[] {
  const issues: Issue[] = [];
  const known = vocabularyTags(vocabulary);
  const error = (message: string) => issues.push({ level: "error", message });

  const checkTags = (owner: string, tags: string[] | undefined) => {
    for (const tag of tags ?? []) {
      if (!known.has(tag)) error(`${owner}: unknown tag "${tag}" (add it to tags.json or fix the typo)`);
    }
  };
  const checkUnique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) error(`duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  };

  checkUnique("augment", catalog.augments.map((a) => a.id));
  checkUnique("item", catalog.items.map((i) => i.id));
  checkUnique("champion", catalog.champions.map((c) => c.id));
  checkUnique("set", catalog.sets.map((s) => s.id));
  checkUnique("rule", catalog.rules.map((r) => r.id));

  const itemIds = new Set(catalog.items.map((i) => i.id));
  const championIds = new Set(catalog.champions.map((c) => c.id));
  const setIds = new Set(catalog.sets.map((s) => s.id));

  for (const augment of catalog.augments) {
    const owner = `augment "${augment.id}" (${augment.name})`;
    checkTags(owner, augment.tags);
    if (!TIER_ORDER.includes(augment.baseTier)) error(`${owner}: invalid baseTier "${augment.baseTier}"`);
    if (augment.setId && !setIds.has(augment.setId)) error(`${owner}: unknown setId "${augment.setId}"`);
    for (const [championId, tier] of Object.entries(augment.championTiers ?? {})) {
      if (!championIds.has(championId)) error(`${owner}: championTiers names unknown champion "${championId}"`);
      if (!TIER_ORDER.includes(tier)) error(`${owner}: invalid tier "${tier}" for champion "${championId}"`);
    }
  }
  for (const item of catalog.items) checkTags(`item "${item.id}" (${item.name})`, item.tags);
  for (const champion of catalog.champions) {
    checkTags(`champion "${champion.id}" (${champion.name})`, champion.tags);
  }

  for (const rule of catalog.rules) {
    const owner = `rule "${rule.id}"`;
    if (!rule.explanation.trim()) error(`${owner}: missing explanation`);
    if (!Number.isFinite(rule.delta) || rule.delta === 0) error(`${owner}: delta must be a non-zero number`);
    const { when } = rule;
    if (Object.keys(when).length === 0) error(`${owner}: empty "when" would match every build`);
    checkTags(owner, when.augmentHasAnyTag);
    checkTags(owner, when.championHasAnyTag);
    if (when.itemTagCount) checkTags(owner, [when.itemTagCount.tag]);
    if (when.takenAugmentTagCount) checkTags(owner, [when.takenAugmentTagCount.tag]);
    for (const id of when.itemIdsAny ?? []) {
      if (!itemIds.has(id)) {
        error(`${owner}: itemIdsAny names unknown item "${id}"`);
        continue;
      }
      const name = catalog.items.find((i) => i.id === id)!.name;
      const sameName = catalog.items.filter((i) => i.name === name).map((i) => i.id);
      if (sameName.length > 1) {
        issues.push({
          level: "warning",
          message: `${owner}: item "${id}" (${name}) shares its name with ${sameName.filter((x) => x !== id).join(", ")}; the rule will not fire for those variants`,
        });
      }
    }
  }
  return issues;
}

export interface Coverage {
  total: number;
  rated: number;
  /** Imported augments with no authored entry yet. */
  unratedIds: string[];
  /** Authored entries whose augment no longer exists in the import, e.g. removed in a patch. */
  orphanedIds: string[];
}

export function augmentCoverage(importedIds: string[], authoredIds: string[]): Coverage {
  const imported = new Set(importedIds);
  const authored = new Set(authoredIds);
  return {
    total: importedIds.length,
    rated: importedIds.filter((id) => authored.has(id)).length,
    unratedIds: importedIds.filter((id) => !authored.has(id)),
    orphanedIds: authoredIds.filter((id) => !imported.has(id)),
  };
}
