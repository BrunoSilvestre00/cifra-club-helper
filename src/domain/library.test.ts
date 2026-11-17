import { it, expect } from "vitest";
import { newSong, newLyric, newTab } from "./model";
import { sortSongs } from "./library";
import { songPath, legacySongPath } from "./slugs";
import { renderSong, songSegments } from "../render/text";
it("ordena por modified_at e usa updatedAt para músicas antigas", () => {
  const a = {
      ...newSong(),
      title: "Antiga",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
    b = {
      ...newSong(),
      title: "Atual",
      modified_at: "2026-01-01T00:00:00.000Z",
    },
    legacy = {
      ...newSong(),
      title: "Legada",
      updatedAt: "2026-02-01T00:00:00.000Z",
      modified_at: undefined,
    };
  expect(sortSongs([a, b, legacy], "modified").map((s) => s.title)).toEqual([
    "Legada",
    "Atual",
    "Antiga",
  ]);
});
it("ordena por artista e nome com acentos sem modificar a biblioteca original", () => {
  const a = { ...newSong(), title: "Zebra", artist: "Álvaro" },
    b = { ...newSong(), title: "Amor", artist: "Bruno" },
    c = { ...newSong(), title: "Casa", artist: "Álvaro" };
  const songs = [b, a, c];
  expect(sortSongs(songs, "artist").map((s) => s.title)).toEqual([
    "Casa",
    "Zebra",
    "Amor",
  ]);
  expect(sortSongs(songs, "title").map((s) => s.title)).toEqual([
    "Amor",
    "Casa",
    "Zebra",
  ]);
  expect(songs).toEqual([b, a, c]);
});
it("ordena pela criação mesmo quando uma música antiga foi editada recentemente", () => {
  const old = {
      ...newSong(),
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2026-11-15T00:00:00.000Z",
    },
    recent = {
      ...newSong(),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
  expect(sortSongs([old, recent], "created")[0].id).toBe(recent.id);
});
it("gera endereço com artista e mantém o alias antigo para recuperação", () => {
  const song = {
    ...newSong(),
    artist: "Nenem e Manuelzito",
    artistSlug: "nenem-e-manuelzito",
    slug: "preto-velho-simiao",
  };
  expect(songPath(song)).toBe("/nenem-e-manuelzito/preto-velho-simiao");
  expect(legacySongPath(song)).toBe("/preto-velho-simiao");
});
it("exporta os títulos predefinidos dos mesmos blocos usados pela prévia", () => {
  const song = newSong(),
    intro = { ...newTab(), part: "Introdução" as const },
    verse = { ...newLyric("Meu lugar"), part: "Verso" as const };
  song.sections = [
    { ...song.sections[0], name: "Música", blocks: [intro, verse] },
  ];
  expect(songSegments(song).map((s) => s.heading)).toEqual(["Intro", "Verso"]);
  expect(renderSong(song)).toContain("[Intro]\n\n");
  expect(renderSong(song)).toContain("[Verso]\n\nMeu lugar");
  expect(renderSong(song)).not.toContain("[Música]");
});
