import { z } from "zod";
import { songSchema, artistSchema, type Song, type Artist } from "./model.ts";
import { slugify } from "./slugs.ts";
export const librarySchema = z.object({
  format: z.literal("cifra-club-helper-library"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  artists: z.array(artistSchema).max(5000),
  songs: z.array(songSchema).max(5000),
});
export type LibraryBackup = z.infer<typeof librarySchema>;
export function libraryKey(song: Song, artists: Artist[] = []) {
  const artist = artists.find((a) => a.id === song.artistId);
  return `${song.artistSlug ?? artist?.slug ?? (song.artist ? slugify(song.artist) : "sem-artista")}/${song.slug ?? slugify(song.title)}`;
}
export function parseLibrary(raw: string): LibraryBackup {
  if (raw.length > 50_000_000)
    throw new Error("A biblioteca excede o limite de 50 MB.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("O arquivo não contém JSON válido.");
  }
  const library = librarySchema.safeParse(value);
  if (library.success) return library.data;
  const song = songSchema.safeParse(value);
  if (song.success)
    return {
      format: "cifra-club-helper-library",
      version: 1,
      exportedAt: new Date().toISOString(),
      artists: [],
      songs: [song.data],
    };
  throw new Error(
    "Biblioteca ou projeto inválido. Confira o formato e a versão do arquivo.",
  );
}
export function inspectLibrary(backup: LibraryBackup, existing: Song[]) {
  const keys = new Set(existing.map((s) => libraryKey(s)));
  const duplicates: Song[] = [];
  for (const song of backup.songs) {
    const key = libraryKey(song, backup.artists);
    if (keys.has(key)) duplicates.push(song);
    keys.add(key);
  }
  return { duplicates, newSongs: backup.songs.length - duplicates.length };
}
