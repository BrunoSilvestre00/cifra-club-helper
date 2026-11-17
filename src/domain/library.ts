import type { Song } from "./model";
export type SongOrder = "artist" | "title" | "created" | "modified";
export function sortSongs(songs: Song[], order: SongOrder) {
  const compare = (a: string, b: string) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
  return [...songs].sort((a, b) => {
    if (order === "modified")
      return (
        (b.modified_at ?? b.updatedAt).localeCompare(
          a.modified_at ?? a.updatedAt,
        ) ||
        compare(a.title, b.title) ||
        a.id.localeCompare(b.id)
      );
    if (order === "created")
      return (
        (b.createdAt ?? b.updatedAt).localeCompare(
          a.createdAt ?? a.updatedAt,
        ) ||
        compare(a.title, b.title) ||
        a.id.localeCompare(b.id)
      );
    return (
      (order === "artist"
        ? compare(a.artist || "\uffff", b.artist || "\uffff")
        : 0) ||
      compare(a.title, b.title) ||
      a.id.localeCompare(b.id)
    );
  });
}
