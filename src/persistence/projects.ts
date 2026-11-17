import {
  songSchema,
  artistSchema,
  uid,
  type Song,
  type Artist,
} from "../domain/model";
import { slugify } from "../domain/slugs";
import {
  librarySchema,
  libraryKey,
  parseLibrary,
  type LibraryBackup,
} from "../domain/backup";
import { database, transact, request, ensureArtist } from "./database";
export async function listArtists(): Promise<Artist[]> {
  return transact(await database(), ["artists"], "readonly", async (tx) =>
    artistSchema
      .array()
      .parse(await request(tx.objectStore("artists").getAll()))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  );
}
export async function createArtist(name: string): Promise<Artist> {
  return transact(await database(), ["artists"], "readwrite", async (tx) => {
    const artist = await ensureArtist(tx, name);
    if (!artist) throw new Error("Informe o nome do artista.");
    return artist;
  });
}
export async function listProjects(): Promise<Song[]> {
  return transact(await database(), ["projects"], "readonly", async (tx) =>
    (await request<unknown[]>(tx.objectStore("projects").getAll()))
      .flatMap((value) => {
        const result = songSchema.safeParse(value);
        return result.success ? [result.data] : [];
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}
export async function saveProject(value: Song): Promise<Song> {
  const song = songSchema.parse(value);
  return transact(
    await database(),
    ["projects", "artists"],
    "readwrite",
    async (tx) => {
      const store = tx.objectStore("projects"),
        old = await request<Song | undefined>(store.get(song.id));
      const known = song.artistId
        ? await request<Artist | undefined>(
            tx.objectStore("artists").get(song.artistId),
          )
        : undefined;
      const artist =
        known ??
        (await ensureArtist(
          tx,
          song.artist,
          song.artistSlug && song.artistSlug !== "sem-artista"
            ? { slug: song.artistSlug }
            : undefined,
        ));
      const saved = songSchema.parse({
        ...song,
        slug: old?.slug ?? song.slug ?? slugify(song.title),
        artist: artist?.name ?? "",
        artistId: artist?.id,
        artistSlug: artist?.slug ?? "sem-artista",
        createdAt: old?.createdAt ?? song.createdAt ?? song.updatedAt,
        modified_at: song.updatedAt,
      });
      const key = libraryKey(saved),
        duplicate = await request<Song | undefined>(
          store.index("libraryKey").get(key),
        );
      if (duplicate && duplicate.id !== saved.id)
        throw new Error(
          "Já existe uma música com este slug para este artista. Abra a música existente ou use outro nome/artista para a nova música.",
        );
      await request(store.put({ ...saved, libraryKey: key }));
      return saved;
    },
  );
}
export async function deleteProject(id: string) {
  await transact(await database(), ["projects"], "readwrite", async (tx) => {
    await request(tx.objectStore("projects").delete(id));
  });
}
export function importProject(raw: string): Song {
  if (raw.length > 5_000_000)
    throw new Error("O arquivo excede o limite de 5 MB.");
  const result = songSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(
      "Projeto inválido ou versão de esquema não suportada. " +
        result.error.issues[0]?.message,
    );
  return result.data;
}
export async function exportLibrary(ids?: string[]): Promise<LibraryBackup> {
  return transact(
    await database(),
    ["projects", "artists"],
    "readonly",
    async (tx) => {
      const songs = (
        await request<unknown[]>(tx.objectStore("projects").getAll())
      ).flatMap((v) => {
        const result = songSchema.safeParse(v);
        return result.success ? [result.data] : [];
      });
      const people = artistSchema
        .array()
        .parse(await request(tx.objectStore("artists").getAll()));
      const chosen = ids ? new Set(ids) : null,
        selected = chosen ? songs.filter((s) => chosen.has(s.id)) : songs;
      const artists =
        selected.length === songs.length
          ? people
          : people.filter((a) =>
              selected.some(
                (s) => s.artistId === a.id || s.artistSlug === a.slug,
              ),
            );
      return librarySchema.parse({
        format: "cifra-club-helper-library",
        version: 1,
        exportedAt: new Date().toISOString(),
        artists,
        songs: selected,
      });
    },
  );
}
type ImportOptions = {
  replaceExisting?: boolean;
};
export async function importLibrary(
  value: string | LibraryBackup,
  options: ImportOptions = {},
) {
  const backup =
    typeof value === "string"
      ? parseLibrary(value)
      : librarySchema.parse(value);
  return transact(
    await database(),
    ["projects", "artists"],
    "readwrite",
    async (tx) => {
      const result = { imported: 0, updated: 0, skipped: 0 };
      const store = tx.objectStore("projects"),
        mapped = new Map<string, Artist>();
      for (const source of backup.artists) {
        const artist = await ensureArtist(tx, source.name, source);
        if (artist) mapped.set(source.id, artist);
      }
      const seen = new Set<string>();
      for (const source of backup.songs) {
        const artist =
          mapped.get(source.artistId ?? "") ??
          (await ensureArtist(
            tx,
            source.artist,
            source.artistSlug && source.artistSlug !== "sem-artista"
              ? { slug: source.artistSlug }
              : undefined,
          ));
        const song = {
          ...source,
          slug: source.slug ?? slugify(source.title),
          artist: artist?.name ?? "",
          artistId: artist?.id,
          artistSlug: artist?.slug ?? "sem-artista",
          createdAt: source.createdAt ?? source.updatedAt,
          modified_at: source.modified_at ?? source.updatedAt,
        };
        const key = libraryKey(song),
          old = await request<Song | undefined>(
            store.index("libraryKey").get(key),
          );
        if (seen.has(key) || (old && !options.replaceExisting)) {
          result.skipped++;
          continue;
        }
        seen.add(key);
        const conflict = await request<Song | undefined>(store.get(song.id));
        const saved = songSchema.parse({
          ...song,
          id: old?.id ?? (conflict ? uid() : song.id),
          createdAt: old?.createdAt ?? song.createdAt,
        });
        await request(store.put({ ...saved, libraryKey: key }));
        if (old) result.updated++;
        else result.imported++;
      }
      return result;
    },
  );
}
export async function storageWarning(): Promise<string> {
  const db = await database();
  const invalid = await transact(
    db,
    ["settings"],
    "readonly",
    async (tx) =>
      await request<{ value: number } | undefined>(
        tx.objectStore("settings").get("invalid-legacy"),
      ),
  );
  return invalid?.value
    ? `${invalid.value} registro(s) antigo(s) inválido(s) foram preservados no navegador.`
    : "";
}
export function download(
  name: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
