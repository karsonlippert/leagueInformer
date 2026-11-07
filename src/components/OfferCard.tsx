import { TIER_ORDER, type ScoredAugment } from "../engine/types.ts";

export function OfferCard({ result, best }: { result: ScoredAugment; best: boolean }) {
  const changed = result.baseTier !== result.adjustedTier;
  const up = result.score > TIER_ORDER.indexOf(result.baseTier);
  return (
    <article className={`card${best ? " best" : ""}${result.unavailable ? " unavailable" : ""}`}>
      <header>
        <h3>{result.augment.name}</h3>
        <div className="tiers" aria-label={changed ? `Tier ${result.baseTier}, ${result.adjustedTier} with synergy` : `Tier ${result.adjustedTier}`}>
          {changed ? (
            <>
              <span className="tier base">{result.baseTier}</span>
              <span aria-hidden="true">→</span>
              <span className={`tier t-${result.adjustedTier}`}>{result.adjustedTier}</span>
              <span className="synergy-label">{up ? "with synergy" : "with this build"}</span>
            </>
          ) : (
            <span className={`tier t-${result.adjustedTier}`}>{result.adjustedTier}</span>
          )}
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
