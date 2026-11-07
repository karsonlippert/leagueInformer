# Mayhem Augment Advisor

Context-aware augment tiers for League of Legends ARAM Mayhem. You enter your champion,
items and the augments you already took, then the three augments on offer. The advisor
re-ranks them for your build and shows why each tier moved.

This is Phase 1: a web app with manual entry and no game integration, so there is nothing
to run alongside the game. See `docs/RESEARCH.md` for the compliance rules and the roadmap.

## Status

- The scoring engine (`src/engine`) and the data tooling (`scripts`, `src/data`) are covered by tests and pass.
- The React UI (`src/App.tsx`, `src/components`) is written but has **not been compiled or
  run yet**. The scaffold was created in a sandbox that could not install npm packages.
  Expect to fix small type or build errors on the first `npm run dev`.
- Package versions in `package.json` are best guesses and unverified.
- All augment, champion and tier data is **placeholder**. The UI shows a banner saying so.

## Run it

```
npm install
npm test        # engine tests, uses Node's built-in test runner (Node 22.6+)
npm run dev
```

## How it works

Tiers are hand-authored recommendations, never win rates. Riot forbids showing augment win
rates in third-party tools.

- `src/data/augments.sample.json`: augments with a base tier and effect tags.
- `src/data/rules.json`: synergy rules. Each rule says "if the augment has this tag and you
  own this kind of item, move it by N tier steps" and carries the explanation shown to the
  user.
- `src/data/sets.sample.json`: augment sets. Each already-taken piece of the same set adds a
  capped bonus.
- `src/engine/scoring.ts`: pure functions, no UI or I/O. `scoreAugment` computes the
  adjusted tier plus the list of reasons; `rankOffers` orders the offered augments.

## Data pipeline

Riot's data and our judgment are kept in separate layers so a patch import never overwrites
hand-written work.

```
npm run import-data     # download augments, items, champions into src/data/generated
npm run data:check      # validate tags, rules and references; report how many augments are rated
```

- `src/data/generated/` is written by the importer and committed. Do not edit it by hand.
  Augments come from CommunityDragon `cherry-augments.json` (Mayhem entries only), items and
  champions from Data Dragon.
- `src/data/authored/` will hold our judgment, keyed by id: base tiers and tags for augments,
  effect tags for items, optional extra champion tags. An imported augment with no authored
  entry is left out of the catalog rather than given an invented tier.
- `src/data/tags.json` is the controlled tag vocabulary. `data:check` rejects any tag not in
  it, and any rule that names an unknown item, set or champion.
- `scripts/fixtures/` holds small made-up feeds so the importer can run offline:
  `npm run import-data -- --fixtures scripts/fixtures --out some/dir`.

The importer has **not been run against the live feeds yet**. The field names it reads
(`nameTRA`, `rarity` codes, the `Kiwi` icon folder) came from other projects' code, not from
a response we fetched. If a feed has a different shape it stops without writing anything and
prints the first raw entry.

### Known gap: the augment list is incomplete

`npm run import-data` keeps only augments whose icon path contains `Kiwi`. Blitz's Mayhem pages
list augments such as Mad Scientist, Eureka, Blade Waltz and Goliath that are **not** in the
199 we imported, so that rule drops real Mayhem augments. Re-run `npm run import-data`: it now
also writes `src/data/generated/augments.rejected.json` (every discarded entry) and prints the
raw field names, so the filter can be corrected from evidence.

### Per-champion tiers from a ranking file

`npm run import-tiers -- --file rankings.json` reads rankings laid out like a ranking page
(champion, then rarity, then tier, then augment names; see `TierFile` in `src/data/types.ts`),
matches names to our ids, and writes `src/data/tiers/champion-tiers.json`. It reports every name
it could not match instead of guessing. Pages that list only S to B leave other augments
unlisted; those get a base tier of C (`unlistedTier`) until we know better. The file must name
its `source`. Only load rankings you have the right to use.

## Next steps

1. Run `npm install` and `npm run dev` locally and fix any build errors.
2. Replace the sample data with the real catalog: import ids, names, icons and rarity from
   CommunityDragon `cherry-augments.json` (entries whose icon path contains `Kiwi/`), and
   match augments by id, never by display name.
3. Author real base tiers, effect tags and rules, versioned per patch.
4. Add icons and a searchable augment browser.
