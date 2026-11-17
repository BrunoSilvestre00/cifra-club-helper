import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { newArrangementLyrics } from "../domain/model";
import BlockEditor from "./BlockEditor";
it("oferece os editores de arranjo e letra no bloco combinado", () => {
  const html = renderToStaticMarkup(
    createElement(BlockEditor, {
      block: newArrangementLyrics(),
      sectionId: "section",
      onCustomize: () => {},
    }),
  );
  expect(html).toContain("Arranjo instrumental");
  expect(html).toContain("Letra e acordes");
  expect(html).toContain("fretboard");
  expect(html).toContain("Letra do bloco");
});
