import type { Augment } from "../engine/types.ts";

interface Props {
  label: string;
  value: string;
  augments: Augment[];
  disabledIds?: string[];
  onChange: (id: string) => void;
}

export function AugmentPicker({ label, value, augments, disabledIds = [], onChange }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">None</option>
        {augments.map((a) => (
          <option key={a.id} value={a.id} disabled={disabledIds.includes(a.id)}>
            {a.name} ({a.rarity})
          </option>
        ))}
      </select>
    </label>
  );
}
