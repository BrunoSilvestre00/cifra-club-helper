import { describe, it, expect } from "vitest";
import {
  newLyric,
  newTab,
  uid,
  newSong,
  presets,
  songSchema,
  techniques,
  type Note,
} from "../domain/model";
import {
  renderLyric,
  layoutLyric,
  renderTab,
  renderNote,
  renderSong,
} from "./text";
import { editLyric, caretOffset } from "../domain/lyrics";

describe("letras e alinhamento", () => {
  it("alinha acordes com índices de caracteres acentuados", () => {
    const l = newLyric("Coração sertanejo");
    l.chords = [
      { id: uid(), name: "E", offset: 0 },
      { id: uid(), name: "B7", offset: 8 },
    ];
    expect(renderLyric(l)).toBe("E       B7\nCoração sertanejo");
  });
  it("amplia a letra para preservar a âncora de acordes próximos", () => {
    const l = newLyric("abcd");
    l.chords = [
      { id: uid(), name: "C#m7", offset: 0 },
      { id: uid(), name: "B7", offset: 1 },
    ];
    const r = layoutLyric(l);
    expect(r.chordText).toBe("C#m7 B7");
    expect(r.lyric).toBe("a    bcd");
    expect(r.positions[1]).toBe(5);
  });
  it("preserva ordem de acordes na mesma âncora sem sobreposição", () => {
    const l = newLyric("abc");
    l.chords = [
      { id: uid(), name: "E", offset: 1 },
      { id: uid(), name: "A", offset: 1 },
    ];
    const r = layoutLyric(l);
    expect(r.chordText).toBe(" E A");
    expect(r.lyric).toBe("a  bc");
    expect(l.text).toBe("abc");
  });
  it("move âncoras com inserções e exclusões", () => {
    const l = newLyric("minha casa");
    l.chords = [{ id: uid(), name: "A", offset: 6 }];
    const next = editLyric(l, "a minha casa")[0];
    expect(next.chords[0].offset).toBe(8);
    expect(editLyric(next, "casa")[0].chords[0].offset).toBe(0);
  });
  it("divide letras coladas em linhas e distribui os acordes", () => {
    const l = newLyric("ab cd");
    l.chords = [{ id: uid(), name: "E", offset: 3 }];
    const lines = editLyric(l, "ab\ncd");
    expect(lines.map((l) => l.text)).toEqual(["ab", "cd"]);
    expect(lines[1].chords[0].offset).toBe(0);
    expect(lines[0].id).toBe(l.id);
  });
  it("normaliza acentos e converte caret UTF-16 para code points", () => {
    expect(caretOffset("a😀é", 3)).toBe(2);
    expect(editLyric(newLyric(), "ac\u0327a\u0303o")[0].text).toBe("ação");
  });
  it("aceita acorde no fim da letra vazia", () => {
    const l = newLyric();
    l.chords = [{ id: uid(), name: "E", offset: 0 }];
    expect(renderLyric(l)).toBe("E\n");
  });
});
describe("tablatura", () => {
  it("preserva alinhamento de notas simultâneas, casas longas e técnicas", () => {
    const t = newTab();
    t.events = [
      {
        id: uid(),
        gap: 2,
        breakBefore: false,
        notes: [
          { id: uid(), course: 0, fret: 12, technique: "hammer", target: 14 },
          { id: uid(), course: 4, fret: 0, technique: "none" },
        ],
      },
    ];
    const rows = renderTab(t, presets.guitar).split("\n");
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    expect(rows[0]).toContain("12h14");
    expect(rows[0].indexOf("12")).toBe(rows[4].indexOf("0"));
  });
  it("renderiza cinco ordens de viola e labels de tamanhos diferentes", () => {
    const rows = renderTab(newTab(), presets.violaE).split("\n");
    expect(rows.length).toBe(5);
    expect(new Set(rows.map((r) => r.indexOf("|"))).size).toBe(1);
    expect(
      presets.violaE.courses.reduce((n, c) => n + c.pitches.length, 0),
    ).toBe(10);
  });
  it("quebra frases em todas as cordas dentro da largura", () => {
    const t = newTab();
    t.events = Array.from({ length: 30 }, (_, i) => ({
      id: uid(),
      gap: 2,
      breakBefore: i === 3,
      notes: [{ id: uid(), course: 0, fret: i, technique: "none" as const }],
    }));
    const r = renderTab(t, presets.guitar, 40);
    expect(r.split("\n\n").length).toBeGreaterThan(2);
    for (const group of r.split("\n\n")) {
      const rows = group.split("\n");
      expect(rows).toHaveLength(6);
      expect(new Set(rows.map((r) => r.length)).size).toBe(1);
      expect(rows[0].length).toBeLessThanOrEqual(40);
    }
  });
  it("renderiza técnicas e permite personalizar símbolos", () => {
    const tokens = techniques.map((technique) =>
      renderNote({ id: uid(), course: 0, fret: 5, target: 7, technique }),
    );
    expect(tokens).toEqual([
      "5",
      "5h7",
      "5p7",
      "5/7",
      "5\\7",
      "5b7",
      "<5>",
      "5~",
    ]);
    const n: Note = { id: uid(), course: 0, fret: 12, technique: "harmonic" };
    expect(renderNote(n)).toBe("<12>");
  });
  it("renderiza pausas sem deslocar cordas", () => {
    const t = newTab();
    t.events = [{ id: uid(), gap: 5, breakBefore: false, notes: [] }];
    expect(
      renderTab(t, presets.guitar)
        .split("\n")
        .every((r) => r.endsWith("--------|")),
    ).toBe(true);
  });
  it("preserva seções mistas em ordem e não exporta metadados como letra", () => {
    const s = newSong();
    s.sections[0].blocks = [newLyric("Minha letra"), newTab()];
    const r = renderSong(s);
    expect(r.indexOf("Minha letra")).toBeLessThan(r.indexOf("E|"));
    expect(r).toContain("[Verso 1]");
    expect(r).not.toContain(s.title);
  });
});
describe("validação de projetos", () => {
  it("valida o esquema atual e rejeita versões incompatíveis", () => {
    const s = newSong();
    expect(songSchema.safeParse(s).success).toBe(true);
    expect(songSchema.safeParse({ ...s, schemaVersion: 2 }).success).toBe(
      false,
    );
  });
  it("rejeita cordas inexistentes e destino ausente", () => {
    const s = newSong();
    const tab = newTab();
    tab.events = [
      {
        id: uid(),
        gap: 2,
        breakBefore: false,
        notes: [{ id: uid(), course: 10, fret: 5, technique: "hammer" }],
      },
    ];
    s.sections[0].blocks = [tab];
    expect(songSchema.safeParse(s).success).toBe(false);
  });
  it("rejeita índices duplicados em um acorde instrumental", () => {
    const s = newSong();
    const tab = newTab();
    tab.events = [
      {
        id: uid(),
        gap: 2,
        breakBefore: false,
        notes: [0, 0].map((course) => ({
          id: uid(),
          course,
          fret: 5,
          technique: "none",
        })),
      },
    ];
    s.sections[0].blocks = [tab];
    expect(songSchema.safeParse(s).success).toBe(false);
  });
});
