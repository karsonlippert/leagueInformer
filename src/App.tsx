import { useMemo, useState } from "react";
import { AugmentPicker } from "./components/AugmentPicker.tsx";
import { OfferCard } from "./components/OfferCard.tsx";
import { catalog, USING_SAMPLE_DATA } from "./catalog.ts";
import { rankOffers } from "./engine/scoring.ts";
import type { BuildContext } from "./engine/types.ts";

const MAX_ITEMS = 6;
const AUGMENT_SLOTS = 4;
const OFFER_SLOTS = 3;

const blanks = (n: number) => Array.from({ length: n }, () => "");
const chosen = (ids: string[]) => ids.filter(Boolean);

export function App() {
  const [championId, setChampionId] = useState("");
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>(blanks(AUGMENT_SLOTS));
  const [offers, setOffers] = useState<string[]>(blanks(OFFER_SLOTS));

  const context: BuildContext = useMemo(
    () => ({ championId: championId || null, itemIds, takenAugmentIds: chosen(taken) }),
    [championId, itemIds, taken],
  );
  const ranked = useMemo(() => rankOffers(chosen(offers), context, catalog), [offers, context]);

  const setAt = (list: string[], set: (v: string[]) => void, index: number, id: string) =>
    set(list.map((v, i) => (i === index ? id : v)));

  const toggleItem = (id: string) =>
    setItemIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX_ITEMS ? [...cur, id] : cur,
    );

  return (
    <div className="app">
      <h1>Mayhem Augment Advisor</h1>
      <p className="lede">
        Tell it what you have. It re-ranks the augments you are offered for your build.
      </p>
      {USING_SAMPLE_DATA && (
        <p className="banner" role="note">
          Placeholder data: augment names and tiers here are samples to demonstrate the engine, not
          real recommendations.
        </p>
      )}

      <div className="layout">
        <section className="panel">
          <h2>Your build</h2>
          <label className="field">
            <span>Champion</span>
            <select value={championId} onChange={(e) => setChampionId(e.target.value)}>
              <option value="">Not set</option>
              {catalog.champions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>
              Items ({itemIds.length}/{MAX_ITEMS})
            </legend>
            <div className="chips">
              {catalog.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip${itemIds.includes(item.id) ? " on" : ""}`}
                  aria-pressed={itemIds.includes(item.id)}
                  onClick={() => toggleItem(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Augments you already took</legend>
            {taken.map((id, i) => (
              <AugmentPicker
                key={i}
                label={`Slot ${i + 1}`}
                value={id}
                augments={catalog.augments}
                disabledIds={chosen(taken).filter((x) => x !== id)}
                onChange={(v) => setAt(taken, setTaken, i, v)}
              />
            ))}
          </fieldset>
        </section>

        <section className="panel">
          <h2>Augments offered</h2>
          {offers.map((id, i) => (
            <AugmentPicker
              key={i}
              label={`Offer ${i + 1}`}
              value={id}
              augments={catalog.augments}
              onChange={(v) => setAt(offers, setOffers, i, v)}
            />
          ))}

          <div className="results" aria-live="polite">
            {ranked.length === 0 && <p className="note">Pick the augments you are offered.</p>}
            {ranked.map((r, i) => (
              <OfferCard key={r.augment.id} result={r} best={i === 0 && !r.unavailable} />
            ))}
          </div>
        </section>
      </div>

      <footer>
        This tool isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot
        Games or anyone officially involved in producing or managing Riot Games properties. Riot
        Games, and all associated properties are trademarks or registered trademarks of Riot Games,
        Inc. Tiers are hand-authored recommendations, not win rates.
      </footer>
    </div>
  );
}
