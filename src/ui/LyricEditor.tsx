import { useRef, useState, type DragEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { chordSchema, uid, type Lyric } from "../domain/model";
import {
  caretOffset,
  chars,
  reanchorLyric,
  splitLyric,
} from "../domain/lyrics";
import { layoutLyric } from "../render/text";
import { useEditor } from "../store/editor";

export default function LyricEditor({
  line,
}: {
  line: Lyric;
  sectionId: string;
}) {
  const { updateBlock } = useEditor();
  const [offset, setOffset] = useState(0),
    [name, setName] = useState("E"),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [tools, setTools] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const chord = line.chords.find((c) => c.id === selected),
    at = Math.min(offset, chars(line.text).length);
  let start = 0;
  const rows = splitLyric(line).map((row) => {
    const result = { ...layoutLyric(row), text: row.text, base: start };
    start += chars(row.text).length + 1;
    return result;
  });
  const update = (fn: (draft: Lyric) => void) =>
    updateBlock(line.id, (b) => {
      if (b.kind === "lyrics") fn(b);
    });
  const pick = (position: number) => {
    setOffset(position);
    setSelected(null);
    setTools(true);
    setTimeout(() => input.current?.focus(), 0);
  };
  const drop = (e: DragEvent, position: number) => {
    if (!e.dataTransfer.types.includes("application/x-compasso-chord")) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(
        e.dataTransfer.getData("application/x-compasso-chord"),
      ) as { block: string; id: string };
      if (data.block === line.id)
        update((b) => {
          const chord = b.chords.find((c) => c.id === data.id);
          if (chord) chord.offset = position;
        });
    } catch {
      /* Ignore foreign drag payloads. */
    }
  };
  return (
    <div className="lyric-editor refined-lyrics">
      <textarea
        className="lyric-input"
        aria-label="Letra do bloco"
        rows={Math.max(3, Math.min(12, rows.length + 1))}
        maxLength={10000}
        value={line.text}
        placeholder={
          "Escreva ou cole a letra deste trecho…\nJá tem acordes? Cole a cifra e clique em Converter cifra no topo do bloco."
        }
        onSelect={(e) =>
          setOffset(
            caretOffset(e.currentTarget.value, e.currentTarget.selectionStart),
          )
        }
        onChange={(e) => {
          const changed = reanchorLyric(
            line,
            e.target.value.replace(/\r\n?/g, "\n"),
          );
          update((b) => {
            b.text = changed.text;
            b.chords = changed.chords;
          });
        }}
      />
      {line.text && (
        <>
          <div className="lyric-preview-label">
            <span>ACORDES SOBRE A LETRA</span>
            <small>Clique na sílaba para inserir um acorde.</small>
          </div>
          <div
            className="lyric-canvas"
            aria-label="Posicionamento visual dos acordes"
          >
            {rows.map((row, index) => (
              <div className="visual-lyric-row" key={index}>
                <div
                  className="chord-lane"
                  style={{
                    minWidth: `${Math.max(chars(row.lyric).length, 20) + 5}ch`,
                  }}
                >
                  {row.placed.map((c) => (
                    <button
                      key={c.id}
                      draggable
                      title={`Editar ${c.name}. Arraste para outra sílaba.`}
                      className={
                        "chord-chip " + (selected === c.id ? "chosen" : "")
                      }
                      style={{ left: `${c.column}ch` }}
                      onClick={() => {
                        setSelected(c.id);
                        setName(c.name);
                        setOffset(row.base + c.offset);
                        setTools(true);
                      }}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData(
                          "application/x-compasso-chord",
                          JSON.stringify({ block: line.id, id: c.id }),
                        );
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div
                  className="syllables"
                  style={{
                    minWidth: `${Math.max(chars(row.lyric).length, 20) + 5}ch`,
                  }}
                >
                  {chars(row.text).map((letter, i) => (
                    <button
                      key={i}
                      className={
                        tools && row.base + i === at ? "caret-char" : ""
                      }
                      style={{ left: `${row.positions[i]}ch` }}
                      onClick={() => pick(row.base + i)}
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes(
                            "application/x-compasso-chord",
                          )
                        )
                          e.preventDefault();
                      }}
                      onDrop={(e) => drop(e, row.base + i)}
                      title={`Inserir acorde em “${letter === " " ? "espaço" : letter}”, linha ${index + 1}`}
                    >
                      {letter === " " ? "\u00a0" : letter}
                    </button>
                  ))}
                  <button
                    className="end-char"
                    style={{
                      left: `${row.positions[chars(row.text).length]}ch`,
                    }}
                    title={`Inserir acorde no fim da linha ${index + 1}`}
                    onClick={() => pick(row.base + chars(row.text).length)}
                    onDragOver={(e) => {
                      if (
                        e.dataTransfer.types.includes(
                          "application/x-compasso-chord",
                        )
                      )
                        e.preventDefault();
                    }}
                    onDrop={(e) => drop(e, row.base + chars(row.text).length)}
                  >
                    ↵
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tools ? (
        <div className="chord-tools">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const result = chordSchema.safeParse({
                id: chord?.id ?? uid(),
                name,
                offset: chord?.offset ?? at,
              });
              if (!result.success) {
                setError(
                  "Informe um acorde sem espaços, com até 24 caracteres.",
                );
                return;
              }
              update((b) => {
                if (chord)
                  b.chords = b.chords.map((c) =>
                    c.id === chord.id ? result.data : c,
                  );
                else b.chords.push(result.data);
              });
              setSelected(result.data.id);
              setError("");
            }}
          >
            <input
              ref={input}
              aria-label="Nome do acorde"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: F#m7"
            />
            <button className="small-button" type="submit">
              <Plus size={13} />
              {chord ? "Aplicar" : "Inserir acorde"}
            </button>
          </form>
          {chord && (
            <>
              <label className="position-label">
                Posição{" "}
                <input
                  type="number"
                  min={1}
                  max={chars(line.text).length + 1}
                  aria-label="Posição do acorde"
                  value={chord.offset + 1}
                  onChange={(e) => {
                    const offset = Number(e.target.value) - 1;
                    if (
                      Number.isInteger(offset) &&
                      offset >= 0 &&
                      offset <= chars(line.text).length
                    )
                      update((b) => {
                        const c = b.chords.find((c) => c.id === chord.id);
                        if (c) c.offset = offset;
                      });
                  }}
                />
              </label>
              <button
                className="icon-button danger"
                title="Remover acorde"
                onClick={() => {
                  update((b) => {
                    b.chords = b.chords.filter((c) => c.id !== chord.id);
                  });
                  setSelected(null);
                }}
              >
                <Trash2 size={14} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(null);
                  setOffset(chars(line.text).length);
                }}
              >
                Novo acorde
              </button>
            </>
          )}
          <button
            className="icon-button close-chord-tools"
            title="Fechar edição de acorde"
            onClick={() => {
              setTools(false);
              setSelected(null);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button className="text-button add-chord-link" onClick={() => pick(at)}>
          <Plus size={14} />
          Adicionar acorde
        </button>
      )}
      {rows.some((r) => r.expanded) && (
        <p className="inline-note">
          Espaçamento ampliado para separar acordes próximos.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
