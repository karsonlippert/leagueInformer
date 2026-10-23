# ARAM Mayhem Augment Advisor: Research Notes

Snapshot: August 2026 research, October 2026 update. Policy text was read through search
results and secondary coverage, not the original pages (direct access to Riot's sites was
blocked in the research environment). Re-read the primary sources before launch.

## Product idea

Show augment tiers for ARAM Mayhem that adapt to the player's context: champion, items
already built, and augments already taken. Example: an "abilities apply on-hit effects"
augment is C-tier in a vacuum but S-tier on a Heartsteel and on-hit build.

## Compliance

The idea is compliant as long as ratings are curated recommendations, not win rates.

1. **No augment win rates.** The LoL game-specific policy reportedly states: "Products
   cannot display win rates for Augments or Arena Mode items. This applies to all websites,
   applications and overlays." Riot's stated reasoning (Arena, July 2023) is that raw win
   rates cause a stagnant meta; it allows pick rates and subjective recommendations.
   - https://support-developer.riotgames.com/hc/en-us/articles/22698698001939-League-of-Legends
   - https://www.dexerto.com/league-of-legends/league-devs-restrict-arena-mode-data-collection-to-avoid-a-stagnant-meta-2215585/
2. **Match-v5 returns 403 for ARAM Mayhem (queue 2400).** Intentional and unannounced.
   Sites publishing Mayhem win rates rely on client-side collection. Do not build on that.
   - https://github.com/RiotGames/developer-relations/issues/1109
   - https://github.com/RiotGames/developer-relations/issues/1154 (open request to release
     data without win/loss)
3. **No automation, no hidden information, no decisions made for the player.** Showing the
   player's own items, augments and offers is fine.
4. **Register the product** on developer.riotgames.com before a public launch. A production
   key needs a working prototype; review takes roughly one to three weeks.
5. **LCU use** is tolerated but unsupported. Riot's policy asks developers to inform Riot
   before releasing or updating, use only approved endpoints, and not enable it in Korea.
   - https://www.riotgames.com/en/DevRel/changes-to-the-lcu-api-policy
6. **Overlays are legal.** Since 29 May 2025 third-party ads inside overlays are not
   allowed. Paid features need Approved or Acknowledged status, a free tier, transformative
   content, and no crypto or NFTs.
7. **Naming and IP.** Keep Riot trademarks out of the product name. Show the "isn't endorsed
   by Riot Games" disclaimer (the app footer does).

## Data access

| Data | Source | Status |
|---|---|---|
| Augment catalog (ids, names, icons, rarity) | CommunityDragon `plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json`; Mayhem entries have `Kiwi/` icon paths. Also served by the local client at `/lol-game-data/assets/v1/cherry-augments.json` | Available |
| Augment descriptions | CommunityDragon `kiwi.bin.json` plus `lol.stringtable.json` | Available |
| Champion, items, level in game | Live Client Data API, `https://127.0.0.1:2999/liveclientdata/allgamedata` (official) | Available; not yet confirmed to run during Mayhem |
| Augments already picked | No Riot API. Overwolf GEP `picked_augment`, or track offers and picks yourself | Workaround only |
| The three augments on offer | No Riot API (checked against LCU REST, LCU WebSocket and Live Client Data). Overwolf GEP `augments`, or screen OCR | Workaround only |
| Post-game own matches | LCU match history | Personal use only |
| Match-v5 | 403 for queue 2400 | Blocked |

## Mode mechanics

- Four augment slots, unlocked at levels 3, 7, 11 and 15. Three offers and one reroll each.
  Rarity phases run Silver, Gold, Prismatic.
- Augment Sets (patch 26.3): themed collections with 2 to 4 piece bonuses.
- Ability Augments (patch 26.12): transform one ability, so value depends on champion.
- Rebalanced every patch, so tier data must be versioned by patch.

## Prior art (October 2026)

All of the following rank augments per champion only. None reacts to items built,
augments taken or set progress. Descriptions of how competitors work come from their own
marketing or from a competitor's comparison post, so treat them as unverified.

- **Blitz**: in-game overlay with a "hand-crafted" Mayhem augment tier list, plus
  per-champion build and augment pages. https://blitz.gg/lol/tierlist/aram-mayhem
- **OP.GG Desktop**: Mayhem augment tier widgets, augment stats, augment-aware match
  history. Reported bug: ability augments matched by display name, so tiers vanish when
  game and app languages differ. Match by id instead.
- **Porofessor**: no Mayhem augment overlay found. Mobalytics and Metasrc: website only.
- **Hexgate, ARAMKit, DPM.LOL**: newer overlays. Hexgate and ARAMKit describe reading the
  offer cards from the screen without injection or memory reading. ARAMKit has a public
  API used by community projects such as `Sygnano/aram-mayhem-tracker`.
- Open source: `Lanternko/ARAM-Mayhem-Database`, `Nyx0ra/lol-aram-mayhem-hextech-helper`,
  `niftymonkey/champ-sage`, `Nikamura/lol-ocr`, `Yhprum/mayhem-tracker`.

## Roadmap

1. **Phase 1, this scaffold:** web app, manual entry, no game integration. Synergy rules
   engine with hand-authored base tiers.
2. **Phase 2:** desktop companion that fills champion, items and level from the Live Client
   Data API; offers by manual click or hotkey OCR. Register the product with Riot here.
3. **Phase 3, optional:** Overwolf app for automatic offer and pick detection.

## Open questions

- Is the Live Client Data API served during Mayhem games? Verify in one real game.
- Who authors and maintains base tiers and rules each patch? This is the main ongoing cost.
- Watch developer-relations issue 1154 for a sanctioned Mayhem data release.
