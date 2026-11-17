import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  instrumentSchema,
  presets,
  techniqueNames,
  type Instrument,
} from "../domain/model";
import { useEditor } from "../store/editor";
import Modal from "./Modal";
import { songElements } from "../domain/blocks";
export default function Settings({
  onClose,
  tabId,
}: {
  onClose: () => void;
  tabId?: string;
}) {
  const { song, update } = useEditor();
  const selectedTab = songElements(song).find((b) => b.id === tabId);
  const [draft, setDraft] = useState<Instrument>(
      structuredClone(
        selectedTab?.kind === "tab"
          ? (selectedTab.instrument ?? song.instrument)
          : song.instrument,
      ),
    ),
    [error, setError] = useState("");
  return (
    <Modal
      title={tabId ? "Afinação do arranjo" : "Configurações de exportação"}
      onClose={onClose}
      wide
    >
      <p className="muted">
        Ordens da mais aguda para a mais grave. Informe as notas com oitavas
        científicas (ex.: E4). Use duas notas para uma ordem dupla.
      </p>
      <label className="field">
        Afinação pronta
        <select
          defaultValue="custom"
          onChange={(e) => {
            if (presets[e.target.value])
              setDraft(structuredClone(presets[e.target.value]));
          }}
        >
          <option value="custom">Personalizada / atual</option>
          {Object.entries(presets).map(([key, p]) => (
            <option key={key} value={key}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Nome do instrumento / afinação
        <input
          value={draft.name}
          maxLength={80}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <div className="tuning-table">
        <div className="tuning-row table-head">
          <span>Ordem</span>
          <span>Nome na TAB</span>
          <span>Notas físicas</span>
          <span />
        </div>
        {draft.courses.map((c, i) => (
          <div className="tuning-row" key={i}>
            <span>{i + 1}ª</span>
            <input
              aria-label={`Nome da linha ${i + 1}`}
              maxLength={8}
              value={c.label}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  courses: draft.courses.map((v, j) =>
                    i === j ? { ...v, label: e.target.value } : v,
                  ),
                })
              }
            />
            <input
              aria-label={`Notas da ordem ${i + 1}`}
              value={c.pitches.join(" ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  courses: draft.courses.map((v, j) =>
                    i === j ? { ...v, pitches: e.target.value.split(" ") } : v,
                  ),
                })
              }
            />
            <button
              className="icon-button danger"
              title={`Remover ordem ${i + 1}`}
              disabled={draft.courses.length === 1}
              onClick={() =>
                setDraft({
                  ...draft,
                  courses: draft.courses.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="small-button"
        disabled={draft.courses.length >= 12}
        onClick={() =>
          setDraft({
            ...draft,
            courses: [...draft.courses, { label: "E", pitches: ["E2"] }],
          })
        }
      >
        <Plus size={14} />
        Adicionar ordem
      </button>
      <p className="inline-note">
        A primeira linha corresponde à primeira ordem. A mudança mantém os
        índices das notas existentes. Não é possível remover ordens que contêm
        notas.
      </p>
      <div className="settings-divider" />
      <label className="field">
        Largura máxima da tablatura (40–160 caracteres)
        <input
          type="number"
          min={40}
          max={160}
          value={song.lineWidth}
          onChange={(e) => {
            const width = Number(e.target.value);
            if (Number.isInteger(width) && width >= 40 && width <= 160)
              update((s) => {
                s.lineWidth = width;
              });
          }}
        />
      </label>
      <details>
        <summary>Símbolos das técnicas</summary>
        <div className="symbol-grid">
          {Object.entries(song.symbols).map(([key, value]) => (
            <label className="field" key={key}>
              {techniqueNames[key as keyof typeof song.symbols]}
              <input
                value={value}
                maxLength={4}
                onChange={(e) => {
                  if (/^[!-~]{1,4}$/.test(e.target.value))
                    update((s) => {
                      s.symbols[key as keyof typeof song.symbols] =
                        e.target.value;
                    });
                }}
              />
            </label>
          ))}
        </div>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="secondary" onClick={onClose}>
          Fechar
        </button>
        <button
          className="primary"
          onClick={() => {
            const result = instrumentSchema.safeParse(draft);
            if (!result.success) {
              setError(
                "Confira os nomes e as notas. Exemplos válidos: E4, B3 B3, G#3 G#4.",
              );
              return;
            }
            const highest = Math.max(
              -1,
              ...songElements(song).flatMap((b) =>
                b.kind === "tab" && (tabId ? b.id === tabId : !b.instrument)
                  ? b.events.flatMap((e) => e.notes.map((n) => n.course))
                  : [],
              ),
            );
            if (highest >= draft.courses.length) {
              setError(
                "Há notas nas ordens que você removeu. Mova ou exclua essas notas primeiro.",
              );
              return;
            }
            update((s) => {
              if (tabId) {
                const b = songElements(s).find((b) => b.id === tabId);
                if (b?.kind === "tab") b.instrument = result.data;
              } else s.instrument = result.data;
            });
            onClose();
          }}
        >
          Aplicar afinação
        </button>
      </div>
    </Modal>
  );
}
