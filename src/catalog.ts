import type { Catalog } from "./engine/scoring.ts";
import type { Augment, AugmentSet, Champion, Item, Rule } from "./engine/types.ts";
import augments from "./data/augments.sample.json";
import champions from "./data/champions.sample.json";
import items from "./data/items.sample.json";
import rules from "./data/rules.json";
import sets from "./data/sets.sample.json";

export const catalog: Catalog = {
  augments: augments as Augment[],
  items: items as Item[],
  champions: champions as Champion[],
  sets: sets as AugmentSet[],
  rules: rules as Rule[],
};

/** True while the catalog is still the placeholder data shipped with the scaffold. */
export const USING_SAMPLE_DATA = true;
