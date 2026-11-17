import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { newSong } from "../domain/model";
import SongCard from "./SongCard";
it("no modo normal o card inteiro abre a música, sem checkbox", () => {
  const html = renderToStaticMarkup(
    createElement(SongCard, {
      song: newSong(),
      selecting: false,
      selected: false,
      onToggle: () => {},
      onDelete: () => {},
    }),
  );
  expect(html).not.toContain('type="checkbox"');
  expect(html).toContain("song-card-open");
  expect(html).toContain("Excluir");
  expect(html.indexOf("</a>")).toBeGreaterThan(html.indexOf("Modificada em"));
});
it("no export mode o card seleciona por checkbox e oculta links e exclusão", () => {
  const html = renderToStaticMarkup(
    createElement(SongCard, {
      song: newSong(),
      selecting: true,
      selected: true,
      onToggle: () => {},
      onDelete: () => {},
    }),
  );
  expect(html).toContain('type="checkbox"');
  expect(html).toContain('checked=""');
  expect(html).toContain("song-selection-surface");
  expect(html).not.toContain("<a ");
  expect(html).not.toContain("Excluir");
});
