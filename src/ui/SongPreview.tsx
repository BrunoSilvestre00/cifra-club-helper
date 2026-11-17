import { useState } from "react";
import { Copy, Minus, Plus, FileText } from "lucide-react";
import type { Song, Lyric, Block } from "../domain/model";
import { blockPart } from "../domain/blocks";
import { splitLyric } from "../domain/lyrics";
import { layoutLyric, renderTab, songSegments } from "../render/text";
function LyricPreview({ line }: { line: Lyric }) {
  return (
    <>
      {splitLyric(line).map((row, i) => {
        const rendered = layoutLyric(row);
        return (
          <span className="cifra-lyric-row" key={i}>
            {rendered.chordText && (
              <span className="cifra-chord-line">
                {rendered.placed.map((chord, index) => {
                  const before =
                    index === 0
                      ? 0
                      : rendered.placed[index - 1].column +
                        Array.from(rendered.placed[index - 1].name).length;
                  return (
                    <span key={chord.id}>
                      {" ".repeat(Math.max(0, chord.column - before))}
                      <b title={chord.name}>{chord.name}</b>
                    </span>
                  );
                })}
                {"\n"}
              </span>
            )}
            <span>
              {rendered.lyric || " "}
              {"\n"}
            </span>
          </span>
        );
      })}
    </>
  );
}
function BlockPreview({ block, song }: { block: Block; song: Song }) {
  if (block.kind === "lyrics") return <LyricPreview line={block} />;
  if (block.kind === "arrangementLyrics")
    return (
      <>
        <BlockPreview block={block.tab} song={song} />
        {"\n"}
        <LyricPreview line={block.lyrics} />
      </>
    );
  return (
    <span className="cifra-tab">
      {renderTab(
        block,
        block.instrument ?? song.instrument,
        song.lineWidth,
        song.symbols,
      )}
      {"\n"}
    </span>
  );
}
export default function SongPreview({
  song,
  selectedId,
  onSelect,
  onCopy,
}: {
  song: Song;
  selectedId: string | null;
  onSelect: (section: string, block: string) => void;
  onCopy: () => void;
}) {
  const [size, setSize] = useState(14),
    [zoom, setZoom] = useState(false);
  const blocks = songSegments(song);
  return (
    <aside className={"cifra-preview " + (zoom ? "reading-mode" : "")}>
      <div className="cifra-preview-bar">
        <span>
          <FileText size={15} />
          Prévia da cifra
        </span>
        <div>
          <button
            className="icon-button"
            title="Diminuir fonte da prévia"
            disabled={size <= 11}
            onClick={() => setSize(size - 1)}
          >
            <Minus size={14} />
          </button>
          <span>{size}</span>
          <button
            className="icon-button"
            title="Aumentar fonte da prévia"
            disabled={size >= 20}
            onClick={() => setSize(size + 1)}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div className="cifra-page">
        <div className="cifra-page-heading">
          <h2>{song.title || "Nova música"}</h2>
          <h3>{song.artist || "Artista não selecionado"}</h3>
          <span>
            Cifra ·{" "}
            {song.instrument.courses.some((c) => c.pitches.length === 2)
              ? "Viola caipira"
              : "Violão"}
          </span>
        </div>
        <div className="cifra-tone">
          Tom: <strong>{song.key || "—"}</strong>
        </div>
        <div
          className="cifra-content"
          style={{ fontSize: size }}
          aria-label="Prévia completa da cifra"
        >
          {blocks.length ? (
            blocks.map(({ section, block, heading }) => (
              <div
                className={
                  "cifra-block " + (selectedId === block.id ? "selected" : "")
                }
                key={block.id}
                tabIndex={0}
                role="button"
                aria-label={`Editar ${blockPart(block)}`}
                onClick={() => onSelect(section.id, block.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(section.id, block.id);
                  }
                }}
              >
                {heading && (
                  <span className="cifra-part">
                    [{heading}]{"\n\n"}
                  </span>
                )}
                <BlockPreview block={block} song={song} />
              </div>
            ))
          ) : (
            <p className="preview-placeholder">
              Sua cifra aparece aqui enquanto você edita.
            </p>
          )}
        </div>
      </div>
      <div className="cifra-preview-footer">
        <button className="primary" onClick={onCopy}>
          <Copy size={15} />
          Copiar cifra completa
        </button>
        <button className="text-button" onClick={() => setZoom(!zoom)}>
          {zoom ? "Voltar à edição" : "Modo leitura"}
        </button>
      </div>
    </aside>
  );
}
