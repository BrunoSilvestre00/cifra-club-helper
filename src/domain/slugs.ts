import type { Song } from "./model";
export function slugify(title: string) {
  const value = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
    .replace(/-$/, "");
  return !value || value === "new" ? "musica" : value;
}
export function songPath(song: Song) {
  return (
    "/" +
    (song.artistSlug ?? (song.artist ? slugify(song.artist) : "sem-artista")) +
    "/" +
    (song.slug ?? `${slugify(song.title)}-${song.id.slice(0, 8)}`)
  );
}
export function legacySongPath(song: Song) {
  return "/" + (song.slug ?? `${slugify(song.title)}-${song.id.slice(0, 8)}`);
}
