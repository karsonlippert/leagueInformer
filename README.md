# Mayhem Augment Advisor

Context-aware augment tiers for League of Legends ARAM Mayhem. You enter your champion,
items and the augments you already took, then the three augments on offer. The advisor
re-ranks them for your build and shows why each tier moved.

This is Phase 1: a web app with manual entry and no game integration, so there is nothing
to run alongside the game. See `docs/RESEARCH.md` for the compliance rules and the roadmap.

## Status

- The scoring engine (`src/engine`) is covered by tests and passes.
- The React UI (`src/App.tsx`, `src/components`) is written but has **not been compiled or
  run yet**. The scaffold was created in a sandbox that could not install npm packages.
  Expect to fix small type or build errors on the first `npm run dev`.
- Package versions in `package.json` are best guesses and unverified.
- All augment, champion and tier data is **placeholder**. The UI shows a banner saying so.

## Run it

```
npm install
npm test        # engine tests, uses Node's built-in test runner (Node 22.18+)
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

## Next steps

1. Run `npm install` and `npm run dev` locally and fix any build errors.
2. Replace the sample data with the real catalog: import ids, names, icons and rarity from
   CommunityDragon `cherry-augments.json` (entries whose icon path contains `Kiwi/`), and
   match augments by id, never by display name.
3. Author real base tiers, effect tags and rules, versioned per patch.
4. Add icons and a searchable augment browser.
