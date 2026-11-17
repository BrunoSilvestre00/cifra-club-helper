import { it, expect } from "vitest";
import {
  newSong,
  newArrangementLyrics,
  presets,
  uid,
  songSchema,
  blockParts,
} from "./model";
import { duplicateBlock, songElements } from "./blocks";
import { renderSong } from "../render/text";
import { importProject } from "../persistence/projects";
import { useEditor } from "../store/editor";
const fixture = () => {
  const song = newSong(),
    block = newArrangementLyrics();
  block.tab.instrument = structuredClone(presets.violaE);
  block.tab.events = [
    {
      id: uid(),
      gap: 2,
      breakBefore: false,
      notes: [{ id: uid(), course: 0, fret: 7, technique: "none" }],
    },
  ];
  block.lyrics.text = "Meu lugar";
  block.lyrics.chords = [{ id: uid(), name: "E", offset: 0 }];
  song.sections[0].blocks = [block];
  return { song, block };
};
it("aceita Música inteira e conserva os dois editores na importação JSON", () => {
  const { song, block } = fixture();
  expect(blockParts).toContain("Música inteira");
  expect(songSchema.safeParse(song).success).toBe(true);
  expect(importProject(JSON.stringify(song))).toEqual(song);
  expect(songElements(song).map((b) => b.id)).toEqual([
    block.id,
    block.tab.id,
    block.lyrics.id,
  ]);
});
it("exporta o arranjo antes da letra com um único título para o trecho", () => {
  const { song } = fixture();
  const text = renderSong(song);
  expect(text).toContain("[Música inteira]");
  expect(text.indexOf("E |")).toBeLessThan(text.indexOf("Meu lugar"));
  expect(text).toContain("E\nMeu lugar");
  expect(text.match(/\[Música inteira\]/g)).toHaveLength(1);
});
it("duplica filhos, acordes, eventos e notas sem compartilhar IDs ou alterações", () => {
  const { song, block } = fixture(),
    copy = duplicateBlock(block);
  if (copy.kind !== "arrangementLyrics") throw new Error();
  const originalIds = new Set([
    block.id,
    block.tab.id,
    block.lyrics.id,
    block.tab.events[0].id,
    block.tab.events[0].notes[0].id,
    block.lyrics.chords[0].id,
  ]);
  const newIds = [
    copy.id,
    copy.tab.id,
    copy.lyrics.id,
    copy.tab.events[0].id,
    copy.tab.events[0].notes[0].id,
    copy.lyrics.chords[0].id,
  ];
  expect(newIds.some((id) => originalIds.has(id))).toBe(false);
  song.sections[0].blocks.push(copy);
  expect(songSchema.safeParse(song).success).toBe(true);
  copy.lyrics.text = "Outra letra";
  copy.tab.events[0].notes[0].fret = 12;
  expect(block.lyrics.text).toBe("Meu lugar");
  expect(block.tab.events[0].notes[0].fret).toBe(7);
});
it("edita os filhos pela store e permite desfazer mantendo o bloco combinado", () => {
  const { song, block } = fixture();
  useEditor.getState().load(song);
  useEditor.getState().updateBlock(block.lyrics.id, (b) => {
    if (b.kind === "lyrics") b.text = "Meu lugar querido";
  });
  useEditor.getState().updateBlock(block.tab.id, (b) => {
    if (b.kind === "tab") b.events[0].notes[0].fret = 9;
  });
  let current = useEditor.getState().song.sections[0].blocks[0];
  if (current.kind !== "arrangementLyrics") throw new Error();
  expect(current.lyrics.text).toBe("Meu lugar querido");
  expect(current.tab.events[0].notes[0].fret).toBe(9);
  useEditor.getState().undo();
  current = useEditor.getState().song.sections[0].blocks[0];
  if (current.kind !== "arrangementLyrics") throw new Error();
  expect(current.tab.events[0].notes[0].fret).toBe(7);
  expect(current.lyrics.text).toBe("Meu lugar querido");
});
it("valida as cordas do arranjo e IDs dos filhos", () => {
  const { song, block } = fixture();
  block.tab.events[0].notes[0].course = 5;
  expect(songSchema.safeParse(song).success).toBe(false);
  block.tab.events[0].notes[0].course = 0;
  block.lyrics.id = block.tab.id;
  expect(songSchema.safeParse(song).success).toBe(false);
});
