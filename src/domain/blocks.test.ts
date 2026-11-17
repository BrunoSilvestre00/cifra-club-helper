import { it, expect } from "vitest";
import { newLyric, newTab, newSong, presets, uid, songSchema } from "./model";
import { duplicateBlock, moveBlock, canUseInstrument } from "./blocks";
import { renderSong, renderLyric } from "../render/text";
import { reanchorLyric } from "./lyrics";
import { slugify, songPath } from "./slugs";
it("duplica arranjos com IDs independentes e mantém a edição original", () => {
  const tab = newTab();
  tab.instrument = structuredClone(presets.violaE);
  tab.events = [
    {
      id: uid(),
      gap: 2,
      breakBefore: false,
      notes: [{ id: uid(), course: 0, fret: 7, technique: "none" }],
    },
  ];
  const copy = duplicateBlock(tab);
  expect(copy.id).not.toBe(tab.id);
  if (copy.kind !== "tab") throw new Error();
  expect(copy.events[0].id).not.toBe(tab.events[0].id);
  expect(copy.events[0].notes[0].id).not.toBe(tab.events[0].notes[0].id);
  copy.events[0].notes[0].fret = 12;
  expect(tab.events[0].notes[0].fret).toBe(7);
  const song = newSong();
  song.sections[0].blocks = [tab, copy];
  expect(songSchema.safeParse(song).success).toBe(true);
});
it("duplica letras e acordes com IDs novos", () => {
  const lyric = newLyric("Meu lugar");
  lyric.chords = [{ id: uid(), offset: 0, name: "E" }];
  const copy = duplicateBlock(lyric);
  expect(copy.id).not.toBe(lyric.id);
  if (copy.kind === "lyrics")
    expect(copy.chords[0].id).not.toBe(lyric.chords[0].id);
});
it("move blocos antes, depois e entre seções sem perder conteúdo", () => {
  const song = newSong(),
    a = newLyric("A"),
    b = newLyric("B"),
    c = newLyric("C");
  song.sections[0].blocks = [a, b, c];
  const section = song.sections[0];
  moveBlock(song, a.id, section.id, c.id);
  expect(section.blocks.map((b) => b.id)).toEqual([b.id, a.id, c.id]);
  song.sections.push({ id: uid(), name: "Refrão", blocks: [] });
  moveBlock(song, b.id, song.sections[1].id, null);
  expect(song.sections[1].blocks).toEqual([b]);
  expect(section.blocks).toEqual([a, c]);
  moveBlock(song, a.id, section.id, a.id);
  expect(section.blocks).toEqual([a, c]);
  moveBlock(song, a.id, "missing", null);
  expect(section.blocks).toEqual([a, c]);
});
it("usa a afinação de cada arranjo na exportação", () => {
  const song = newSong(),
    guitar = newTab(),
    viola = newTab();
  viola.instrument = presets.violaD;
  song.sections[0].blocks = [guitar, viola];
  const text = renderSong(song);
  expect(text).toContain("E|--|");
  expect(text).toContain("F#|--|");
  expect(text.split("\n").filter((l) => l.includes("|"))).toHaveLength(11);
});
it("protege notas da sexta corda na mudança para viola", () => {
  const tab = newTab();
  tab.events = [
    {
      id: uid(),
      gap: 2,
      breakBefore: false,
      notes: [{ id: uid(), course: 5, fret: 3, technique: "none" }],
    },
  ];
  expect(canUseInstrument(tab, presets.violaE)).toBe(false);
  expect(canUseInstrument(tab, presets.guitar)).toBe(true);
});
it("mantém várias linhas e acordes dentro de um bloco de letra", () => {
  const lyric = newLyric("A casa\nMeu lugar");
  lyric.chords = [{ id: uid(), offset: 7, name: "E" }];
  expect(
    songSchema.safeParse({
      ...newSong(),
      sections: [{ id: uid(), name: "Verso", blocks: [lyric] }],
    }).success,
  ).toBe(true);
  expect(renderLyric(lyric)).toBe("A casa\nE\nMeu lugar");
  const changed = reanchorLyric(lyric, "A casa\nO Meu lugar");
  expect(changed.chords[0].offset).toBe(9);
  expect(changed.id).toBe(lyric.id);
});
it("gera slugs sem acentos e preserva o endereço salvo ao renomear", () => {
  expect(slugify("Canção do Sertão!")).toBe("cancao-do-sertao");
  expect(slugify("new")).toBe("musica");
  const song = { ...newSong(), slug: "meu-endereco" };
  song.title = "Nome novo";
  expect(songPath(song)).toBe("/sem-artista/meu-endereco");
});
