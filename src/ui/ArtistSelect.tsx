import { useState } from "react";
import { Plus } from "lucide-react";
import type { Artist } from "../domain/model";
import { createArtist } from "../persistence/projects";
import Modal from "./Modal";
export default function ArtistSelect({
  artists,
  value,
  onChange,
  onCreated,
}: {
  artists: Artist[];
  value: string;
  onChange: (artist: Artist | null) => void;
  onCreated: (artist: Artist) => void;
}) {
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <label className="artist-field">
        Artista
        <select
          aria-label="Artista da música"
          value={value}
          onChange={(e) => {
            if (e.target.value === "__new") {
              setName("");
              setError("");
              setAdding(true);
            } else
              onChange(artists.find((a) => a.id === e.target.value) ?? null);
          }}
        >
          <option value="">Selecione um artista</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
          <option value="__new">＋ Cadastrar novo artista…</option>
        </select>
      </label>
      {adding && (
        <Modal
          title="Cadastrar artista"
          onClose={() => {
            if (!busy) setAdding(false);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setBusy(true);
              try {
                const artist = await createArtist(name);
                onCreated(artist);
                onChange(artist);
                setAdding(false);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Não foi possível cadastrar o artista.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Nome do artista
              <input
                autoFocus
                required
                maxLength={200}
                placeholder="Ex.: Nenem e Manuelzito"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-footer">
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy || !name.trim()}>
                <Plus size={15} />
                {busy ? "Cadastrando…" : "Cadastrar e selecionar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
