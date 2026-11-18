import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { newTab, uid } from "../domain/model";
import TabEditor from "./TabEditor";
it("abre o primeiro evento automaticamente e não marca as notas existentes como seleção pendente", () => {
  const tab = newTab();
  tab.events = [
    {
      id: uid(),
      gap: 2,
      breakBefore: false,
      notes: [{ id: uid(), course: 0, fret: 7, technique: "none" }],
    },
  ];
  const html = renderToStaticMarkup(createElement(TabEditor, { tab }));
  expect(html).toContain("event-inspector");
  expect(html).toContain("event selected");
  expect(html).toContain("fret existing");
  expect(html).toContain("Uma posição por corda.");
  expect(html).toContain("Adicionar");
  expect(html).toContain("<kbd>Enter</kbd>");
  expect(html).toContain("casa 19");
  expect(html).not.toContain("casa 20");
  expect(html).toContain("0–19");
});
