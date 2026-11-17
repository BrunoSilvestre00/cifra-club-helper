import { useEffect, useMemo, useRef, useState } from "react";
import {
  Music2,
  Plus,
  Search,
  Upload,
  Trash2,
  ArrowLeft,
  FolderOpen,
  RefreshCw,
  X,
  ArrowDownAZ,
  Download,
} from "lucide-react";
import { newSong, uid, type Song, type Artist } from "../domain/model";
import { songPath, legacySongPath } from "../domain/slugs";
import { sortSongs, type SongOrder } from "../domain/library";
import {
  deleteProject,
  importLibrary,
  exportLibrary,
  download,
  listProjects,
  listArtists,
  storageWarning,
} from "../persistence/projects";
import {
  parseLibrary,
  inspectLibrary,
  type LibraryBackup,
} from "../domain/backup";
import {
  usePageMeta,
  useRoute,
  navigate,
  replaceRoute,
  appHref,
  routePath,
} from "./navigation";
import SongEditor from "./SongEditor";
import Modal from "./Modal";
import ThemeSelect from "./ThemeSelect";
import SongCard from "./SongCard";

export default function App() {
  const path = useRoute(),
    isNew = path === "/new";
  const [projects, setProjects] = useState<Song[]>([]),
    [artists, setArtists] = useState<Artist[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [loadFailed, setLoadFailed] = useState(false),
    [migration, setMigration] = useState("");
  const [search, setSearch] = useState(""),
    [order, setOrder] = useState<SongOrder>("created"),
    [removing, setRemoving] = useState<Song | null>(null),
    [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set()),
    [exportMode, setExportMode] = useState(false),
    [pendingImport, setPendingImport] = useState<LibraryBackup | null>(null),
    [replaceDuplicates, setReplaceDuplicates] = useState(false);
  const selection = projects.filter((song) => selectedSongs.has(song.id));
  const inspection = pendingImport
    ? inspectLibrary(pendingImport, projects)
    : null;
  useEffect(() => {
    if (path !== "/" || !exportMode) return;
    const key = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "a" ||
        document.querySelector("dialog[open]")
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input:not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable="true"]',
        )
      )
        return;
      event.preventDefault();
      setSelectedSongs(
        event.shiftKey ? new Set() : new Set(projects.map((s) => s.id)),
      );
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [path, projects, exportMode]);
  const draft = useMemo(() => {
    const song = newSong();
    song.title = "Nova música";
    song.sections = [{ id: uid(), name: "Música", blocks: [] }];
    return song;
  }, [isNew]);
  const current = projects.find(
    (p) => songPath(p) === path || legacySongPath(p) === path,
  );
  const editor = isNew ? draft : current;
  const editingId = useRef(editor?.id);
  editingId.current = editor?.id;
  usePageMeta(
    path === "/" ? "Minhas músicas" : editor?.title || "Música não encontrada",
    editor
      ? `${editor.title}${editor.artist ? " — " + editor.artist : ""}. Editor de cifras e arranjos.`
      : "Suas músicas organizadas para o Cifra Club.",
  );
  useEffect(() => {
    if (current && path !== songPath(current)) replaceRoute(songPath(current));
  }, [current?.id, path, current?.artistSlug]);
  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const [songs, people] = await Promise.all([
        listProjects(),
        listArtists(),
      ]);
      setProjects(songs);
      setArtists(people);
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar as músicas.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const warning = await storageWarning();
        const [songs, people] = await Promise.all([
          listProjects(),
          listArtists(),
        ]);
        if (active) {
          setProjects(songs);
          setArtists(people);
          setMigration(warning);
        }
      } catch (e) {
        if (active) {
          setLoadFailed(true);
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar as músicas.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const acceptSong = (song: Song) =>
    setProjects((p) => [song, ...p.filter((s) => s.id !== song.id)]);
  const acceptArtist = (artist: Artist) =>
    setArtists((p) =>
      [artist, ...p.filter((a) => a.id !== artist.id)].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    );
  const onSaved = (song: Song) => {
    acceptSong(song);
    if (
      editingId.current === song.id &&
      (routePath() === path || routePath() === "/new") &&
      routePath() !== songPath(song)
    )
      replaceRoute(songPath(song));
  };
  const filtered = sortSongs(
    projects.filter((p) =>
      (p.title + " " + p.artist)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    ),
    order,
  );
  return (
    <div className="app-shell helper-app">
      <header className="app-header">
        <a
          href={appHref("/")}
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            void navigate("/");
          }}
        >
          <img
            className="brand-logo"
            src={import.meta.env.BASE_URL + "assets/logo.png"}
            width="39"
            height="39"
            alt=""
          />
          <span>
            Cifra Club <em>Helper</em>
          </span>
        </a>
        <span className="workspace-name">
          Suas ideias, prontas para virar cifra.
        </span>
        <span className="storage-label">
          <span />
          Salvo neste navegador
        </span>
        <ThemeSelect />
      </header>
      {loading ? (
        <div className="loading-screen" role="status">
          <Music2 size={26} />
          Carregando suas músicas…
        </div>
      ) : loadFailed && !editor ? (
        <main className="library-page">
          <div className="library-empty">
            <FolderOpen size={38} />
            <h1>Não foi possível abrir suas músicas</h1>
            <p role="alert">{error}</p>
            <button className="primary" onClick={() => void refresh()}>
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </main>
      ) : path === "/" ? (
        <main className="library-page">
          <div className="library-heading">
            <div>
              <span className="eyebrow accent">SEU REPERTÓRIO</span>
              <h1>Minhas músicas</h1>
              <p>Organize suas letras e arranjos. Continue de onde parou.</p>
            </div>
            <a
              className="primary"
              href={appHref("/new")}
              onClick={(e) => {
                e.preventDefault();
                void navigate("/new");
              }}
            >
              <Plus size={18} />
              Nova música
            </a>
          </div>
          {migration && (
            <p className="library-notice" role="status">
              {migration}
            </p>
          )}
          {error && (
            <div className="notice" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                title="Fechar aviso"
                onClick={() => setError("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="library-toolbar">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Buscar músicas"
                placeholder="Buscar música ou artista"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="library-sort">
              <ArrowDownAZ size={16} />
              <span>Ordenar por</span>
              <select
                aria-label="Ordenar músicas"
                value={order}
                onChange={(e) => setOrder(e.target.value as SongOrder)}
              >
                <option value="artist">Artista (A–Z)</option>
                <option value="title">Nome (A–Z)</option>
                <option value="created">Criação (mais recentes)</option>
                <option value="modified">
                  Última alteração (mais recentes)
                </option>
              </select>
            </label>
            <button
              className="secondary"
              disabled={busy || projects.length === 0}
              onClick={() => {
                setSelectedSongs(new Set());
                setExportMode(!exportMode);
              }}
            >
              <Download size={15} />
              {exportMode ? "Cancelar exportação" : "Exportar seleção"}
            </button>
            {!exportMode && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={15} />
                Importar biblioteca
              </button>
            )}
          </div>
          <div className="library-summary">
            {projects.length} {projects.length === 1 ? "música" : "músicas"} ·{" "}
            {artists.length} {artists.length === 1 ? "artista" : "artistas"}
          </div>
          {exportMode && (
            <div className="library-bulk">
              <span>
                Modo de exportação · {selection.length} de {projects.length}{" "}
                selecionadas
              </span>
              <button
                className="text-button"
                title="Selecionar todas as músicas (Ctrl+A / ⌘A)"
                onClick={() =>
                  setSelectedSongs(new Set(projects.map((s) => s.id)))
                }
              >
                Selecionar todas
              </button>
              <button
                className="text-button"
                title="Desselecionar todas (Ctrl+Shift+A / ⌘Shift+A)"
                disabled={!selection.length}
                onClick={() => setSelectedSongs(new Set())}
              >
                Desselecionar todas
              </button>
              <button
                className="primary"
                disabled={busy || !selection.length}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const library = await exportLibrary(
                      selection.map((s) => s.id),
                    );
                    download(
                      `cifra-club-helper-biblioteca-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(library, null, 2),
                      "application/json",
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Não foi possível exportar a biblioteca.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download size={15} />
                {selection.length === projects.length
                  ? "Exportar biblioteca inteira"
                  : `Exportar seleção (${selection.length})`}
              </button>
            </div>
          )}
          {projects.length === 0 ? (
            <div className="library-empty">
              <span className="empty-music-icon">
                <Music2 size={32} />
              </span>
              <h2>Seu repertório começa aqui</h2>
              <p>
                Crie uma música, escolha o artista e monte a estrutura em
                blocos.
              </p>
              <a
                href={appHref("/new")}
                className="primary"
                onClick={(e) => {
                  e.preventDefault();
                  void navigate("/new");
                }}
              >
                <Plus size={17} />
                Criar primeira música
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="library-empty">
              <Search size={28} />
              <h2>Nenhuma música encontrada</h2>
              <p>Tente outro título ou artista.</p>
            </div>
          ) : (
            <div className="song-grid">
              {filtered.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  selecting={exportMode}
                  selected={selectedSongs.has(song.id)}
                  onToggle={() =>
                    setSelectedSongs((previous) => {
                      const next = new Set(previous);
                      if (next.has(song.id)) next.delete(song.id);
                      else next.add(song.id);
                      return next;
                    })
                  }
                  onDelete={() => {
                    setError("");
                    setRemoving(song);
                  }}
                />
              ))}
            </div>
          )}
        </main>
      ) : editor ? (
        <SongEditor
          key={editor.id}
          project={editor}
          isNew={isNew}
          artists={artists}
          onArtistCreated={acceptArtist}
          onSaved={onSaved}
        />
      ) : (
        <main className="library-page">
          <div className="library-empty">
            <Music2 size={35} />
            <h1>Música não encontrada</h1>
            <p>Este endereço não corresponde a uma música salva.</p>
            <a
              href={appHref("/")}
              className="primary"
              onClick={(e) => {
                e.preventDefault();
                void navigate("/");
              }}
            >
              <ArrowLeft size={16} />
              Minhas músicas
            </a>
          </div>
        </main>
      )}
      <input
        hidden
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            if (file.size > 50_000_000)
              throw new Error("O arquivo excede 50 MB.");
            setPendingImport(parseLibrary(await file.text()));
            setReplaceDuplicates(false);
            setError("");
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível importar o projeto.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {pendingImport && inspection && (
        <Modal
          title="Importar biblioteca"
          onClose={() => {
            if (!busy) setPendingImport(null);
          }}
          wide
        >
          <p className="muted">
            {pendingImport.songs.length} música(s) e{" "}
            {pendingImport.artists.length} artista(s) no arquivo.{" "}
            {inspection.newSongs} música(s) nova(s) e{" "}
            {inspection.duplicates.length} repetida(s), verificadas pelo slug do
            artista + slug da música.
          </p>
          {inspection.duplicates.length > 0 && (
            <>
              <details className="import-duplicates">
                <summary>Ver músicas repetidas</summary>
                <ul>
                  {inspection.duplicates.slice(0, 30).map((song, index) => (
                    <li key={index}>
                      {song.artist || "Sem artista"} — {song.title}
                    </li>
                  ))}
                </ul>
                {inspection.duplicates.length > 30 && (
                  <p>Mais {inspection.duplicates.length - 30} repetida(s).</p>
                )}
              </details>
              <label className="import-replace">
                <input
                  type="checkbox"
                  checked={replaceDuplicates}
                  onChange={(e) => setReplaceDuplicates(e.target.checked)}
                />
                Atualizar músicas já existentes com os dados do arquivo
              </label>
              <p className="inline-note">
                Desmarcado: as repetidas serão ignoradas e as músicas atuais
                serão preservadas.
              </p>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setPendingImport(null)}
            >
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await importLibrary(pendingImport, {
                    replaceExisting: replaceDuplicates,
                  });
                  const [songs, people] = await Promise.all([
                    listProjects(),
                    listArtists(),
                  ]);
                  setProjects(songs);
                  setArtists(people);
                  setPendingImport(null);
                  setMigration(
                    `${result.imported} música(s) importada(s), ${result.updated} atualizada(s), ${result.skipped} repetida(s) ignorada(s).`,
                  );
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível importar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Upload size={15} />
              {busy ? "Importando…" : "Importar biblioteca"}
            </button>
          </div>
        </Modal>
      )}
      {removing && (
        <Modal
          title="Excluir música?"
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <p className="muted">
            “{removing.title}” será removida. Exporte um backup JSON antes se
            quiser guardar uma cópia.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </button>
            <button
              className="primary destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteProject(removing.id);
                  setProjects((p) => p.filter((s) => s.id !== removing.id));
                  setRemoving(null);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível excluir.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={15} />
              Excluir música
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
