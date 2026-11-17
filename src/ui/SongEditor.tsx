import { useEffect, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Undo2,
  Redo2,
  Download,
  Check,
  Copy,
  Settings2,
  FileText,
  Guitar,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronRight,
  Save,
  PanelLeftClose,
} from "lucide-react";
import {
  newLyric,
  newTab,
  newArrangementLyrics,
  blockParts,
  type Song,
  type Artist,
  type Block,
} from "../domain/model";
import {
  blockPart,
  blockKindLabel,
  duplicateBlock,
  moveBlock,
} from "../domain/blocks";
import { download } from "../persistence/projects";
import { renderSong } from "../render/text";
import { useEditor } from "../store/editor";
import { persistNow, flushProject, usePersistence } from "./persistence";
import {
  usePageMeta,
  setNavigationGuard,
  navigate,
  appHref,
} from "./navigation";
import EditableText from "./EditableText";
import ArtistSelect from "./ArtistSelect";
import BlockEditor from "./BlockEditor";
import SongPreview from "./SongPreview";
import Settings from "./Settings";
import Modal from "./Modal";

const dragType = "application/x-cifra-helper-block";
export default function SongEditor({
  project,
  isNew,
  artists,
  onArtistCreated,
  onSaved,
}: {
  project: Song;
  isNew: boolean;
  artists: Artist[];
  onArtistCreated: (artist: Artist) => void;
  onSaved: (song: Song) => void;
}) {
  const {
    song,
    status,
    message,
    past,
    future,
    activeSection,
    activeBlock,
    update,
    load,
    select,
    undo,
    redo,
  } = useEditor();
  const [loaded, setLoaded] = useState(false),
    [modal, setModal] = useState<"export" | "settings" | null>(null),
    [tuningBlock, setTuningBlock] = useState<string | undefined>(),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState<string | null>(null),
    [over, setOver] = useState(""),
    [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    load(project);
    setLoaded(true);
  }, [project.id, load]);
  usePersistence(loaded, onSaved);
  useEffect(() => {
    if (!loaded) return;
    return setNavigationGuard(async () => {
      if (isNew && useEditor.getState().status === "saved") return;
      await flushProject();
      onSaved(useEditor.getState().song);
    });
  }, [loaded, isNew, onSaved]);
  usePageMeta(
    song.title || "Nova música",
    `${song.title}${song.artist ? " — " + song.artist : ""}. Cifra e arranjos no Cifra Club Helper.`,
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!loaded) return;
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [loaded, undo, redo]);
  const entries = song.sections.flatMap((section) =>
    section.blocks.map((block) => ({ section, block })),
  );
  const selected =
    entries.find((e) => e.block.id === activeBlock) ?? entries[0];
  const section =
    song.sections.find((s) => s.id === activeSection) ?? song.sections[0];
  async function save() {
    try {
      const saved = await persistNow();
      onSaved(saved);
      setToast("Música salva.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        renderSong(useEditor.getState().song),
      );
      setToast("Cifra completa copiada.");
    } catch {
      setError(
        "Não foi possível copiar. Baixe o arquivo TXT pelo botão Exportar.",
      );
    }
  }
  const choose = (sectionId: string, blockId: string) => {
    select(sectionId, blockId);
    setSidebarOpen(false);
  };
  const add = (kind: Block["kind"]) => {
    const target = selected?.section ?? section;
    const block: Block =
      kind === "lyrics"
        ? { ...newLyric(), part: "Verso" }
        : kind === "arrangementLyrics"
          ? {
              ...newArrangementLyrics(),
              tab: {
                ...newTab(),
                instrument: structuredClone(song.instrument),
              },
            }
          : {
              ...newTab(),
              part: "Introdução",
              instrument: structuredClone(song.instrument),
            };
    update((s) => {
      const blocks = s.sections.find((sec) => sec.id === target.id)!.blocks;
      const index = selected
        ? blocks.findIndex((b) => b.id === selected.block.id) + 1
        : blocks.length;
      blocks.splice(index, 0, block);
    });
    choose(target.id, block.id);
  };
  const modify = (fn: (block: Block) => void) => {
    if (selected)
      update((s) => {
        const b = s.sections
          .flatMap((sec) => sec.blocks)
          .find((b) => b.id === selected.block.id);
        if (b) fn(b);
      });
  };
  const shift = (delta: number) => {
    if (!selected) return;
    const index = entries.findIndex((e) => e.block.id === selected.block.id),
      target = entries[index + delta];
    if (!target) return;
    update((s) => {
      if (delta < 0)
        moveBlock(s, selected.block.id, target.section.id, target.block.id);
      else {
        const next = entries[index + 2];
        moveBlock(
          s,
          selected.block.id,
          target.section.id,
          next?.section.id === target.section.id ? next.block.id : null,
        );
      }
    });
    choose(target.section.id, selected.block.id);
  };
  const drop = (e: DragEvent, sectionId: string, before: string | null) => {
    if (!e.dataTransfer.types.includes(dragType)) return;
    e.preventDefault();
    const id = e.dataTransfer.getData(dragType);
    update((s) => moveBlock(s, id, sectionId, before));
    choose(sectionId, id);
    setDragging(null);
    setOver("");
  };
  const dragOver = (e: DragEvent, key: string) => {
    if (!e.dataTransfer.types.includes(dragType)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOver(key);
  };
  if (!loaded)
    return (
      <div className="loading-screen" role="status">
        Abrindo música…
      </div>
    );
  return (
    <>
      <div className="song-document-bar">
        <div className="song-heading">
          <a
            href={appHref("/")}
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              void navigate("/");
            }}
          >
            <ArrowLeft size={15} />
            Minhas músicas
          </a>
          <h1>
            <EditableText
              className="song-title"
              value={song.title}
              placeholder="Nova música"
              label="Editar nome da música"
              onChange={(title) =>
                update((s) => {
                  s.title = title;
                })
              }
            />
          </h1>
        </div>
        <div className="song-actions">
          <span
            className={"save-state " + (status === "error" ? "error" : "")}
            role="status"
          >
            {status === "saved" ? (
              <Check size={14} />
            ) : (
              <span className="status-dot" />
            )}
            {isNew
              ? "Nova música"
              : {
                  loading: "Carregando…",
                  dirty: "Alterações pendentes",
                  saving: "Salvando…",
                  saved: "Salvo",
                  error: "Falha ao salvar",
                }[status]}
          </span>
          <button
            className="icon-button"
            title="Desfazer (Ctrl+Z)"
            disabled={!past.length}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            title="Refazer (Ctrl+Shift+Z)"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <button className="secondary" onClick={() => void save()}>
            <Save size={15} />
            {isNew ? "Salvar música" : "Salvar"}
          </button>
          <button className="primary" onClick={() => setModal("export")}>
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>
      {(message || error) && (
        <div className="notice" role="alert">
          <span>{error || message}</span>
          <button
            className="text-button"
            onClick={() => {
              setError("");
              void save();
            }}
          >
            Tentar salvar
          </button>
        </div>
      )}
      <div className="focused-workspace">
        <aside className={"structure-sidebar " + (sidebarOpen ? "open" : "")}>
          <div className="structure-title">
            <div>
              <span className="eyebrow">ESTRUTURA</span>
              <h2>Blocos da música</h2>
            </div>
            <span className="count-badge">{entries.length}</span>
          </div>
          <nav aria-label="Estrutura da música">
            {entries.map(({ section, block }, index) => (
              <div
                key={block.id}
                className={
                  "structure-item " +
                  (selected?.block.id === block.id ? "active " : "") +
                  (dragging === block.id ? "dragging " : "") +
                  (over === block.id ? "drop-before" : "")
                }
                onDragOver={(e) => dragOver(e, block.id)}
                onDrop={(e) => drop(e, section.id, block.id)}
              >
                <button
                  className="block-grip icon-button"
                  draggable
                  aria-label={`Arrastar ${blockPart(block)}`}
                  title="Arrastar bloco"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData(dragType, block.id);
                    setDragging(block.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver("");
                  }}
                >
                  <GripVertical size={16} />
                </button>
                <button
                  className="structure-select"
                  aria-current={
                    selected?.block.id === block.id ? "true" : undefined
                  }
                  onClick={() => choose(section.id, block.id)}
                >
                  <span className="structure-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="structure-item-label">
                    <strong>{blockPart(block)}</strong>
                    <small>
                      {block.kind === "lyrics"
                        ? "Letra e acordes"
                        : block.kind === "tab"
                          ? "Arranjo instrumental"
                          : blockKindLabel(block)}
                    </small>
                  </span>
                  {selected?.block.id === block.id && (
                    <ChevronRight size={14} />
                  )}
                </button>
              </div>
            ))}
          </nav>
          <div
            className={"structure-end " + (over === "end" ? "drop-before" : "")}
            onDragOver={(e) => dragOver(e, "end")}
            onDrop={(e) => drop(e, song.sections.at(-1)!.id, null)}
          >
            {dragging ? "Soltar no fim da música" : ""}
          </div>
          {entries.length === 0 && (
            <p className="structure-empty">
              Adicione o primeiro bloco para começar.
            </p>
          )}
          <div className="structure-add">
            <span>ADICIONAR BLOCO</span>
            <button className="secondary" onClick={() => add("lyrics")}>
              <Plus size={14} />
              <FileText size={14} />
              Letra
            </button>
            <button className="secondary" onClick={() => add("tab")}>
              <Plus size={14} />
              <Guitar size={14} />
              Arranjo
            </button>
            <button
              className="secondary"
              onClick={() => add("arrangementLyrics")}
            >
              <Plus size={14} />
              <Guitar size={14} />
              Arranjo com letra
            </button>
          </div>
          <div className="structure-tip">
            <GripVertical size={15} />
            <p>
              Arraste os blocos para organizar a música. Selecione um para
              editar.
            </p>
          </div>
        </aside>
        <main className="focused-editor">
          <button
            className="mobile-structure secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <PanelLeftClose size={16} />
            Estrutura da música
          </button>
          <div className="song-properties">
            <ArtistSelect
              artists={artists}
              value={song.artistId ?? ""}
              onCreated={onArtistCreated}
              onChange={(artist) =>
                update((s) => {
                  s.artist = artist?.name ?? "";
                  s.artistId = artist?.id;
                  s.artistSlug = artist?.slug ?? "sem-artista";
                })
              }
            />
            <label>
              Tom
              <input
                aria-label="Tom da música"
                value={song.key}
                maxLength={20}
                onChange={(e) =>
                  update((s) => {
                    s.key = e.target.value;
                  })
                }
              />
            </label>
            <button
              className="icon-button"
              title="Instrumento inicial e configurações"
              onClick={() => {
                setTuningBlock(undefined);
                setModal("settings");
              }}
            >
              <Settings2 size={17} />
            </button>
          </div>
          {selected ? (
            <>
              <div className="focused-block-intro">
                <div>
                  <span className="eyebrow">
                    EDITANDO BLOCO{" "}
                    {entries.findIndex(
                      (e) => e.block.id === selected.block.id,
                    ) + 1}{" "}
                    DE {entries.length}
                  </span>
                  <h2>{blockPart(selected.block)}</h2>
                  <p>
                    {selected.block.kind === "lyrics"
                      ? "Escreva a letra e posicione os acordes nas sílabas."
                      : selected.block.kind === "tab"
                        ? "Monte o arranjo no braço do instrumento."
                        : "Edite o arranjo e a letra juntos neste trecho."}
                  </p>
                </div>
                <span
                  className={
                    "block-type " +
                    (selected.block.kind !== "lyrics" ? "arrangement" : "")
                  }
                >
                  {selected.block.kind !== "lyrics" ? (
                    <Guitar size={15} />
                  ) : (
                    <FileText size={15} />
                  )}{" "}
                  {blockKindLabel(selected.block)}
                </span>
              </div>
              <article className="focused-block">
                <div className="focused-block-toolbar">
                  <label>
                    Parte da música
                    <select
                      aria-label="Título do bloco"
                      value={blockPart(selected.block)}
                      onChange={(e) =>
                        modify((b) => {
                          b.part = e.target
                            .value as (typeof blockParts)[number];
                          b.name = undefined;
                        })
                      }
                    >
                      {blockParts.map((part) => (
                        <option key={part} value={part}>
                          {part}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="block-actions">
                    <button
                      className="icon-button"
                      title="Subir bloco"
                      disabled={entries[0].block.id === selected.block.id}
                      onClick={() => shift(-1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="icon-button"
                      title="Descer bloco"
                      disabled={entries.at(-1)!.block.id === selected.block.id}
                      onClick={() => shift(1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="icon-button"
                      title="Duplicar bloco"
                      onClick={() => {
                        const copy = duplicateBlock(selected.block);
                        update((s) => {
                          const blocks = s.sections.find(
                            (sec) => sec.id === selected.section.id,
                          )!.blocks;
                          blocks.splice(
                            blocks.findIndex(
                              (b) => b.id === selected.block.id,
                            ) + 1,
                            0,
                            copy,
                          );
                        });
                        choose(selected.section.id, copy.id);
                        setToast("Bloco duplicado.");
                      }}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      title="Excluir bloco (pode desfazer)"
                      onClick={() => {
                        const index = entries.findIndex(
                            (e) => e.block.id === selected.block.id,
                          ),
                          next = entries[index + 1] ?? entries[index - 1];
                        update((s) => {
                          const sec = s.sections.find(
                            (sec) => sec.id === selected.section.id,
                          )!;
                          sec.blocks = sec.blocks.filter(
                            (b) => b.id !== selected.block.id,
                          );
                        });
                        if (next) choose(next.section.id, next.block.id);
                        else select(selected.section.id, null);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <BlockEditor
                  key={selected.block.id}
                  block={selected.block}
                  sectionId={selected.section.id}
                  onCustomize={(id) => {
                    setTuningBlock(id);
                    setModal("settings");
                  }}
                />
              </article>
              <div className="focused-editor-footer">
                <span>Alterações salvas automaticamente.</span>
                <button
                  className="text-button"
                  onClick={() => add(selected.block.kind)}
                >
                  <Plus size={14} />
                  Novo bloco de{" "}
                  {blockKindLabel(selected.block).toLocaleLowerCase("pt-BR")}
                </button>
              </div>
            </>
          ) : (
            <div className="first-block">
              <span className="empty-music-icon">
                <MusicNote />
              </span>
              <h2>Vamos montar sua música?</h2>
              <p>
                Escolha o artista acima e adicione letra, arranjo ou os dois no
                mesmo bloco. O resultado aparece ao lado.
              </p>
              <div>
                <button className="primary" onClick={() => add("lyrics")}>
                  <Plus size={16} />
                  <FileText size={16} />
                  Adicionar letra
                </button>
                <button className="secondary" onClick={() => add("tab")}>
                  <Plus size={16} />
                  <Guitar size={16} />
                  Adicionar arranjo
                </button>
                <button
                  className="secondary"
                  onClick={() => add("arrangementLyrics")}
                >
                  <Plus size={16} />
                  <Guitar size={16} />
                  Arranjo com letra
                </button>
              </div>
            </div>
          )}
        </main>
        <SongPreview
          song={song}
          selectedId={selected?.block.id ?? null}
          onSelect={choose}
          onCopy={() => void copy()}
        />
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal === "settings" && (
        <Settings tabId={tuningBlock} onClose={() => setModal(null)} />
      )}
      {modal === "export" && (
        <Modal title="Exportar música" onClose={() => setModal(null)}>
          <div className="export-options">
            <button
              onClick={() => download(`${song.title}.txt`, renderSong(song))}
            >
              <FileText />
              <span>
                <strong>Baixar TXT</strong>
                <small>Letra, acordes e arranjos para o Cifra Club.</small>
              </span>
              <Download size={18} />
            </button>
            <button onClick={() => void copy()}>
              <Copy />
              <span>
                <strong>Copiar texto</strong>
                <small>A música completa na ordem dos blocos.</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() =>
                download(
                  `${song.title}.json`,
                  JSON.stringify(song, null, 2),
                  "application/json",
                )
              }
            >
              <Save />
              <span>
                <strong>Backup JSON</strong>
                <small>Continue editando depois.</small>
              </span>
              <Download size={18} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function MusicNote() {
  return <Guitar size={30} />;
}
