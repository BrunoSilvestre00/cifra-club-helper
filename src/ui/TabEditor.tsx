import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Pause,
  CornerDownLeft,
} from "lucide-react";
import {
  uid,
  techniques,
  techniqueNames,
  type Tab,
  type Technique,
  type Note,
  type TabEvent,
} from "../domain/model";
import { renderNote, renderTab } from "../render/text";
import {
  toggleFret,
  selectedEvent,
  eventAfterRemoval,
  notesFromPositions,
  addNotes,
  type FretPosition,
} from "../domain/arrangement";
import { useEditor } from "../store/editor";

const targeted = (t: Technique) =>
  ["hammer", "pull", "slideUp", "slideDown", "bend"].includes(t);
export default function TabEditor({ tab }: { tab: Tab }) {
  const { song, updateBlock } = useEditor();
  const instrument = tab.instrument ?? song.instrument;
  const [selected, setSelected] = useState<string | null>(
      tab.events[0]?.id ?? null,
    ),
    [noteId, setNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FretPosition[]>([]);
  const positions = draft.filter((p) => p.course < instrument.courses.length);
  const [mode, setMode] = useState<"sequence" | "simultaneous">("sequence"),
    [technique, setTechnique] = useState<Technique>("none"),
    [target, setTarget] = useState(7),
    [startFret, setStartFret] = useState(0);
  const visibleFretCount = Math.min(20, 37 - startFret);
  const [feedback, setFeedback] = useState(
    "Selecione as posições no braço e clique em Adicionar ou pressione Enter.",
  );
  const event = selectedEvent(tab.events, selected),
    note = event?.notes.find((n) => n.id === noteId) ?? event?.notes[0];
  const mutate = (fn: (events: TabEvent[]) => void) =>
    updateBlock(tab.id, (b) => {
      if (b.kind === "tab") fn(b.events);
    });
  const commit = () => {
    if (!positions.length) return;
    const notes = notesFromPositions(positions, technique, Math.trunc(target));
    let next: string | null = null;
    mutate((events) => {
      next = addNotes(events, notes, event?.id ?? null, mode);
    });
    setSelected(next);
    setNoteId(notes[0].id);
    setDraft([]);
    setFeedback(
      `${notes.length === 1 ? "Nota adicionada" : `${notes.length} notas adicionadas juntas`}${mode === "simultaneous" && event ? " ao evento selecionado" : " em um novo evento"}.`,
    );
  };
  const changeNote = (patch: Partial<Note>) => {
    if (!event || !note) return;
    mutate((events) => {
      const ev = events.find((e) => e.id === event.id)!;
      const n = ev.notes.find((n) => n.id === note.id)!;
      if (
        patch.course !== undefined &&
        ev.notes.some(
          (other) => other.id !== n.id && other.course === patch.course,
        )
      )
        return;
      Object.assign(n, patch);
    });
  };
  const move = (direction: number) => {
    if (!event) return;
    mutate((events) => {
      const index = events.findIndex((e) => e.id === event.id),
        to = index + direction;
      if (to >= 0 && to < events.length) {
        events.splice(index, 1);
        events.splice(to, 0, event);
      }
    });
  };
  return (
    <div
      className="tab-editor"
      onKeyDown={(e) => {
        if (
          e.key !== "Enter" ||
          e.nativeEvent.isComposing ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.shiftKey
        )
          return;
        if (!(e.target instanceof Element) || !e.target.closest("button.fret"))
          return;
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) commit();
      }}
    >
      <div className="tab-toolbar">
        <div className="segmented">
          <button
            className={mode === "sequence" ? "active" : ""}
            onClick={() => setMode("sequence")}
          >
            Novo evento
          </button>
          <button
            className={mode === "simultaneous" ? "active" : ""}
            onClick={() => setMode("simultaneous")}
          >
            No evento selecionado
          </button>
        </div>
        <label>
          Técnica{" "}
          <select
            aria-label="Técnica para novas notas"
            value={technique}
            onChange={(e) => setTechnique(e.target.value as Technique)}
          >
            {techniques.map((t) => (
              <option key={t} value={t}>
                {techniqueNames[t]}
              </option>
            ))}
          </select>
        </label>
        {targeted(technique) && (
          <label>
            Destino{" "}
            <input
              aria-label="Casa destino para novas notas"
              type="number"
              min={0}
              max={36}
              value={target}
              onChange={(e) =>
                setTarget(Math.max(0, Math.min(36, Number(e.target.value))))
              }
            />
          </label>
        )}
      </div>
      <div className="fretboard-scroll">
        <div
          className="fretboard"
          style={{
            gridTemplateColumns: `42px repeat(${visibleFretCount}, minmax(40px, 1fr))`,
            minWidth: 42 + visibleFretCount * 40,
          }}
        >
          <div className="fret-label">Casa</div>
          {Array.from({ length: visibleFretCount }, (_, i) => (
            <div className="fret-label" key={i}>
              {i + startFret}
            </div>
          ))}
          {instrument.courses.map((course, c) => (
            <div className="fret-row" key={c}>
              <div className="string-label" title={course.pitches.join(" + ")}>
                {course.label}
                <small>{c + 1}</small>
              </div>
              {Array.from({ length: visibleFretCount }, (_, i) => {
                const fret = i + startFret;
                const existing = event?.notes.some(
                  (n) => n.course === c && n.fret === fret,
                );
                const active = positions.some(
                  (p) => p.course === c && p.fret === fret,
                );
                return (
                  <button
                    key={i}
                    className={
                      "fret " +
                      (course.pitches.length === 2 ? "double " : "") +
                      (active ? "selected" : existing ? "existing" : "")
                    }
                    style={
                      {
                        "--string-weight": `${1 + c * 0.35}px`,
                      } as React.CSSProperties
                    }
                    aria-label={`${course.pitches.length === 2 ? "Ordem" : "Corda"} ${c + 1} ${course.label}, casa ${fret}`}
                    aria-pressed={active}
                    onClick={() =>
                      setDraft((current) =>
                        toggleFret(current, { course: c, fret }),
                      )
                    }
                  >
                    <span>
                      {active || existing ? fret : fret === 0 ? "0" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="fretboard-markers" aria-hidden="true">
            {Array.from({ length: visibleFretCount }, (_, i) => {
              const fret = i + startFret;
              return [3, 5, 7, 9, 12, 15, 17].includes(fret) ? (
                <i
                  className="fretboard-marker"
                  key={fret}
                  style={{ gridColumn: i + 2 }}
                />
              ) : null;
            })}
          </div>
        </div>
      </div>
      <div className="fret-selection">
        <div className="fret-selection-notes">
          <strong>
            {positions.length
              ? `${positions.length} ${positions.length === 1 ? "posição selecionada" : "posições selecionadas"}`
              : "Selecione uma ou mais posições"}
          </strong>
          <span>
            {positions
              .map(
                (p) =>
                  `${p.course + 1}ª ${instrument.courses[p.course].label} · casa ${p.fret}`,
              )
              .join("  +  ") ||
              "Uma posição por corda. Clique novamente para desmarcar."}
          </span>
        </div>
        <button
          className="text-button"
          disabled={!positions.length}
          onClick={() => setDraft([])}
        >
          Limpar
        </button>
        <button
          className="primary add-fret-selection"
          disabled={!positions.length}
          onClick={commit}
        >
          <Plus size={15} />
          Adicionar <kbd>Enter</kbd>
        </button>
      </div>
      <div className="fret-caption">
        <span>
          Agudas acima · {instrument.courses.length}{" "}
          {instrument.courses.some((c) => c.pitches.length === 2)
            ? "ordens"
            : "cordas"}{" "}
          · {instrument.courses.reduce((n, c) => n + c.pitches.length, 0)}{" "}
          cordas físicas
        </span>
        <label>
          Casas{" "}
          <select
            aria-label="Faixa de casas"
            value={startFret}
            onChange={(e) => setStartFret(Number(e.target.value))}
          >
            {[0, 19].map((n) => (
              <option key={n} value={n}>
                {n}–{Math.min(n + 19, 36)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="inline-note" aria-live="polite">
        {mode === "simultaneous"
          ? "As posições serão acrescentadas ao evento selecionado ao confirmar. "
          : ""}
        {feedback}
      </p>
      <div className="sequence-head">
        <span className="eyebrow">SEQUÊNCIA DE EVENTOS</span>
        <button
          className="small-button"
          onClick={() => {
            const ev: TabEvent = {
              id: uid(),
              notes: [],
              gap: 3,
              breakBefore: false,
            };
            mutate((events) => {
              const i = events.findIndex((e) => e.id === event?.id);
              events.splice(i < 0 ? events.length : i + 1, 0, ev);
            });
            setSelected(ev.id);
            setNoteId(null);
          }}
        >
          <Pause size={13} />
          Pausa
        </button>
        <button
          className="small-button"
          onClick={() => {
            const last = tab.events.at(-1);
            setSelected(last?.id ?? null);
            setNoteId(last?.notes[0]?.id ?? null);
            setMode("sequence");
            setFeedback("A próxima nota será inserida no fim da sequência.");
          }}
        >
          <Plus size={13} />
          No fim
        </button>
      </div>
      <div className="event-list">
        {tab.events.length === 0 && (
          <div className="empty-sequence">Sua frase começa no braço acima.</div>
        )}
        {tab.events.map((ev, i) => (
          <button
            className={"event " + (event?.id === ev.id ? "selected" : "")}
            aria-pressed={event?.id === ev.id}
            key={ev.id}
            onClick={() => {
              setSelected(ev.id);
              setNoteId(ev.notes[0]?.id ?? null);
            }}
          >
            <small>
              {String(i + 1).padStart(2, "0")}
              {ev.breakBefore && " ↵"}
            </small>
            <span>
              {ev.notes.length
                ? ev.notes.map((n) => renderNote(n, song.symbols)).join(" · ")
                : "—"}
            </span>
            <small>
              {ev.notes.length > 1
                ? `${ev.notes.length} notas`
                : ev.notes.length
                  ? instrument.courses[ev.notes[0].course]?.label
                  : "Pausa"}
            </small>
          </button>
        ))}
      </div>
      {event && (
        <div className="event-inspector">
          <div className="inspector-heading">
            <strong>
              Evento {tab.events.findIndex((e) => e.id === event.id) + 1}
            </strong>
            <button
              className="icon-button"
              title="Mover evento para a esquerda"
              disabled={tab.events[0].id === event.id}
              onClick={() => move(-1)}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              className="icon-button"
              title="Mover evento para a direita"
              disabled={tab.events.at(-1)?.id === event.id}
              onClick={() => move(1)}
            >
              <ArrowRight size={15} />
            </button>
            <button
              className="icon-button danger"
              title="Excluir evento"
              onClick={() => {
                const next = eventAfterRemoval(tab.events, event.id);
                mutate((events) => {
                  const i = events.findIndex((e) => e.id === event.id);
                  events.splice(i, 1);
                });
                setSelected(next?.id ?? null);
                setNoteId(next?.notes[0]?.id ?? null);
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="inspector-fields">
            <label>
              Espaço após
              <input
                aria-label="Espaçamento do evento"
                type="number"
                min={1}
                max={16}
                value={event.gap}
                onChange={(e) => {
                  const gap = Number(e.target.value);
                  if (Number.isInteger(gap) && gap >= 1 && gap <= 16)
                    mutate((events) => {
                      events.find((ev) => ev.id === event.id)!.gap = gap;
                    });
                }}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={event.breakBefore}
                onChange={(e) =>
                  mutate((events) => {
                    events.find((ev) => ev.id === event.id)!.breakBefore =
                      e.target.checked;
                  })
                }
              />
              <CornerDownLeft size={14} />
              Nova frase
            </label>
            {event.notes.length > 0 && (
              <label>
                Nota
                <select
                  aria-label="Selecionar nota do evento"
                  value={note?.id ?? ""}
                  onChange={(e) => setNoteId(e.target.value)}
                >
                  {event.notes.map((n) => (
                    <option value={n.id} key={n.id}>
                      {instrument.courses[n.course]?.label} ·{" "}
                      {renderNote(n, song.symbols)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {note && (
              <>
                <label>
                  Corda / ordem
                  <select
                    aria-label="Corda da nota selecionada"
                    value={note.course}
                    onChange={(e) =>
                      changeNote({ course: Number(e.target.value) })
                    }
                  >
                    {instrument.courses.map((c, i) => (
                      <option
                        key={i}
                        value={i}
                        disabled={event.notes.some(
                          (n) => n.id !== note.id && n.course === i,
                        )}
                      >
                        {i + 1} · {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Casa
                  <input
                    aria-label="Casa da nota selecionada"
                    type="number"
                    min={0}
                    max={36}
                    value={note.fret}
                    onChange={(e) => {
                      const fret = Number(e.target.value);
                      if (Number.isInteger(fret) && fret >= 0 && fret <= 36)
                        changeNote({ fret });
                    }}
                  />
                </label>
                <label>
                  Técnica
                  <select
                    aria-label="Técnica da nota selecionada"
                    value={note.technique}
                    onChange={(e) => {
                      const t = e.target.value as Technique;
                      changeNote({
                        technique: t,
                        target: targeted(t)
                          ? (note.target ?? Math.min(36, note.fret + 1))
                          : undefined,
                      });
                    }}
                  >
                    {techniques.map((t) => (
                      <option key={t} value={t}>
                        {techniqueNames[t]}
                      </option>
                    ))}
                  </select>
                </label>
                {targeted(note.technique) && (
                  <label>
                    Destino
                    <input
                      aria-label="Casa destino da nota selecionada"
                      type="number"
                      min={0}
                      max={36}
                      value={note.target ?? 0}
                      onChange={(e) => {
                        const target = Number(e.target.value);
                        if (
                          Number.isInteger(target) &&
                          target >= 0 &&
                          target <= 36
                        )
                          changeNote({ target });
                      }}
                    />
                  </label>
                )}
                <button
                  className="small-button danger"
                  onClick={() => {
                    mutate((events) => {
                      const ev = events.find((e) => e.id === event.id)!;
                      ev.notes = ev.notes.filter((n) => n.id !== note.id);
                    });
                    setNoteId(null);
                  }}
                >
                  <Trash2 size={13} />
                  Nota
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <pre className="tab-output" aria-label="Tablatura ASCII">
        {renderTab(tab, instrument, song.lineWidth, song.symbols)}
      </pre>
    </div>
  );
}
