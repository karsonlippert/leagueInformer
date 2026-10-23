import type { ScoredAugment } from "../engine/types.ts";

export function OfferCard({ result, best }: { result: ScoredAugment; best: boolean }) {
  const changed = result.baseTier !== result.adjustedTier;
  return (
    <article className={`card${best ? " best" : ""}${result.unavailable ? " unavailable" : ""}`}>
      <header>
        <h3>{result.augment.name}</h3>
        <div className="tiers" aria-label={`Tier ${result.adjustedTier}`}>
          {changed && <span className="tier base">{result.baseTier}</span>}
          {changed && <span aria-hidden="true">→</span>}
          <span className={`tier t-${result.adjustedTier}`}>{result.adjustedTier}</span>
        </div>
      </header>
      {result.augment.note && <p className="note">{result.augment.note}</p>}
      {result.adjustments.length > 0 && (
        <ul className="why">
          {result.adjustments.map((a, i) => (
            <li key={i}>
              {a.delta !== 0 && (
                <strong className={a.delta > 0 ? "up" : "down"}>
                  {a.delta > 0 ? "+" : ""}
                  {a.delta}
                </strong>
              )}{" "}
              {a.label}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
