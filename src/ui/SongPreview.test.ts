import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { newSong, newLyric, newArrangementLyrics, uid } from "../domain/model";
import SongPreview from "./SongPreview";
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
