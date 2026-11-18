import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { newSong, newLyric, newTab, newArrangementLyrics, uid } from "../domain/model";
import { renderSong } from "../render/text";
import SongPreview from "./SongPreview";
it("agrupa títulos consecutivos de partes iguais e repete o título quando a parte retorna", () => {
  const song = newSong();
  const first = { ...newLyric("Primeira introdução"), part: "Introdução" as const };
  const arrangement = { ...newTab(), part: "Introdução" as const };
  const third = { ...newLyric("Continuação da introdução"), part: "Introdução" as const };
  const chorus = { ...newLyric("Letra do refrão"), part: "Refrão" as const };
  const repeat = { ...newLyric("Retorno da introdução"), part: "Introdução" as const };
  song.sections[0].blocks = [first, arrangement, third, chorus, repeat];
  const html = renderToStaticMarkup(createElement(SongPreview, {
    song,
    selectedId: arrangement.id,
    onSelect: () => {},
    onCopy: () => {},
  }));
  expect(html.match(/\[Intro\]/g)).toHaveLength(2);
  expect(html.match(/\[Refrão\]/g)).toHaveLength(1);
  expect(html.match(/aria-label="Editar Introdução"/g)).toHaveLength(4);
  expect(html).toContain("Primeira introdução");
  expect(html).toContain("Continuação da introdução");
  expect(html).toContain("Retorno da introdução");
  const text = renderSong(song);
  expect(text.match(/\[Intro\]/g)).toHaveLength(2);
  expect(text.match(/\[Refrão\]/g)).toHaveLength(1);
  expect(text.indexOf("Primeira introdução")).toBeLessThan(text.indexOf("Continuação da introdução"));
  expect(text.indexOf("Continuação da introdução")).toBeLessThan(text.indexOf("Letra do refrão"));
});
it("destaca os acordes estruturados e mantém a letra como texto comum", () => {
  const song = newSong(),
    line = newLyric("E eu volto para casa");
  line.part = "Refrão";
  line.chords = [{ id: uid(), name: "B7", offset: 5 }];
  song.sections = [{ ...song.sections[0], name: "Música", blocks: [line] }];
  const html = renderToStaticMarkup(
    createElement(SongPreview, {
      song,
      selectedId: line.id,
      onSelect: () => {},
      onCopy: () => {},
    }),
  );
  expect(html).toContain('<b title="B7">B7</b>');
  expect(html).not.toContain('<b title="E">');
  expect(html).toContain("[Refrão]");
  expect(html).toContain("E eu volto para casa");
  expect(html).toContain("cifra-preview");
});
it("mostra tablatura e letra no mesmo trecho da prévia", () => {
  const song = newSong(),
    block = newArrangementLyrics();
  block.lyrics.text = "Letra do arranjo";
  song.sections[0].blocks = [block];
  const html = renderToStaticMarkup(
    createElement(SongPreview, {
      song,
      selectedId: block.id,
      onSelect: () => {},
      onCopy: () => {},
    }),
  );
  expect(html).toContain("[Música inteira]");
  expect(html).toContain("cifra-tab");
  expect(html).toContain("Letra do arranjo");
});
