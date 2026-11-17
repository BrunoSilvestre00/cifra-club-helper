import { useState } from "react";
import { Settings2 } from "lucide-react";
import { presets, type Tab, type Instrument } from "../domain/model";
import { canUseInstrument, instrumentType } from "../domain/blocks";
export default function ArrangementSetup({
  tab,
  fallback,
  onChange,
  onCustom,
}: {
  tab: Tab;
  fallback: Instrument;
  onChange: (instrument: Instrument) => void;
  onCustom: () => void;
}) {
  const instrument = tab.instrument ?? fallback,
    type = instrumentType(instrument);
  const preset =
    Object.entries(presets).find(
      ([, p]) => JSON.stringify(p) === JSON.stringify(instrument),
    )?.[0] ?? "custom";
  const [error, setError] = useState("");
  const apply = (next: Instrument) => {
    if (!canUseInstrument(tab, next)) {
      setError(
        "Este bloco tem notas na 6ª corda. Mova ou exclua essas notas antes de mudar para viola.",
      );
      return;
    }
    onChange(structuredClone(next));
    setError("");
  };
  return (
    <div className="arrangement-setup">
      <div className="arrangement-selects">
        <label>
          Instrumento
          <select
            aria-label="Instrumento do arranjo"
            value={type}
            onChange={(e) =>
              apply(presets[e.target.value === "guitar" ? "guitar" : "violaE"])
            }
          >
            <option value="guitar">Violão · 6 cordas</option>
            <option value="viola">Viola · 10 cordas / 5 ordens</option>
          </select>
        </label>
        <label>
          Afinação
          <select
            aria-label="Afinação do arranjo"
            value={preset}
            onChange={(e) => {
              if (e.target.value === "custom") onCustom();
              else apply(presets[e.target.value]);
            }}
          >
            {Object.entries(presets)
              .filter(([, p]) => instrumentType(p) === type)
              .map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name.split(" · ")[1]}
                </option>
              ))}
            <option value="custom">
              {preset === "custom" ? instrument.name : "Personalizar…"}
            </option>
          </select>
        </label>
        <button
          className="icon-button"
          title="Personalizar afinação deste arranjo"
          onClick={onCustom}
        >
          <Settings2 size={16} />
        </button>
      </div>
      <div className="arrangement-tuning" aria-label="Cordas do arranjo">
        <span>{type === "viola" ? "ORDENS" : "CORDAS"}</span>
        {instrument.courses.map((c, i) => (
          <span className="tuning-chip" key={i} title={c.pitches.join(" + ")}>
            <small>{i + 1}ª</small>
            {c.label}
            {c.pitches.length === 2 && <sup>×2</sup>}
          </span>
        ))}
        <small>agudas → graves</small>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
