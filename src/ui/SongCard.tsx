import { Music2, ArrowUpRight, FileText, Guitar, Trash2 } from "lucide-react";
import type { Song } from "../domain/model";
import { songPath } from "../domain/slugs";
import { appHref, navigate } from "./navigation";
function CardContent({ song, selecting }: { song: Song; selecting: boolean }) {
  const blocks = song.sections.flatMap((s) => s.blocks);
  return (
    <>
      <div className="song-card-main">
        <div className="song-card-top">
          <span className="song-card-icon">
            <Music2 size={24} />
          </span>
          {!selecting && <ArrowUpRight size={18} />}
        </div>
        <span className="card-artist">{song.artist || "Sem artista"}</span>
        <h2>{song.title || "Sem título"}</h2>
        <div className="song-card-tags">
          <span>
            <FileText size={12} />
            {blocks.filter((b) => b.kind === "lyrics").length} letras
          </span>
          <span>
            <Guitar size={12} />
            {blocks.filter((b) => b.kind === "tab").length} arranjos
          </span>
          {blocks.some((b) => b.kind === "arrangementLyrics") && (
            <span>
              <Guitar size={12} />
              {blocks.filter((b) => b.kind === "arrangementLyrics").length}{" "}
              arranjos com letra
            </span>
          )}
        </div>
      </div>
      <div className="song-card-footer">
        <div>
          <span>
            Criada em{" "}
            {new Date(song.createdAt ?? song.updatedAt).toLocaleDateString(
              "pt-BR",
            )}
          </span>
          <span>
            Modificada em{" "}
            {new Date(song.modified_at ?? song.updatedAt).toLocaleString(
              "pt-BR",
              { dateStyle: "short", timeStyle: "short" },
            )}
          </span>
        </div>
      </div>
    </>
  );
}
export default function SongCard({
  song,
  selecting,
  selected,
  onToggle,
  onDelete,
}: {
  song: Song;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const label = `Selecionar ${song.title} — ${song.artist || "Sem artista"}`,
    id = `select-song-${song.id}`;
  return (
    <article
      className={
        "song-card " +
        (selecting ? "is-selecting " : "") +
        (selected && selecting ? "is-selected" : "")
      }
    >
      {selecting ? (
        <>
          <CardContent song={song} selecting />
          <input
            className="song-card-checkbox"
            id={id}
            type="checkbox"
            aria-label={label}
            checked={selected}
            onChange={onToggle}
          />
          <label className="song-selection-surface" htmlFor={id}>
            <span className="sr-only">{label}</span>
          </label>
        </>
      ) : (
        <>
          <a
            className="song-card-open"
            href={appHref(songPath(song))}
            onClick={(e) => {
              e.preventDefault();
              void navigate(songPath(song));
            }}
          >
            <CardContent song={song} selecting={false} />
          </a>
          <button
            className="icon-button danger song-delete"
            title={`Excluir ${song.title}`}
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </article>
  );
}
