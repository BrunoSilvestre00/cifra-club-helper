import { expect, it } from "vitest";
import { newLyric, newSong, newArrangementLyrics, lyricSchema, uid } from "./model";
import { caretOffset, chars, convertPastedLyric, splitLyric } from "./lyrics";
import { useEditor } from "../store/editor";

it("converte linhas de acordes e preserva suas colunas e as estrofes", () => {
  const original = newLyric("  Am      G\nEu volto pra casa\n\nF#m7(b5)  B7/F#\nCoração em paz");
  const { lyric, converted } = convertPastedLyric(original);
  expect(lyric.text).toBe("Eu volto pra casa\n\nCoração em paz");
  expect(converted).toBe(4);
  const base = chars("Eu volto pra casa\n\n").length;
  expect(lyric.chords.map(({ name, offset }) => [name, offset])).toEqual([
    ["Am", 2], ["G", 10], ["F#m7(b5)", base], ["B7/F#", base + 10],
  ]);
  expect(lyric.id).toBe(original.id);
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
  expect(original.chords).toEqual([]);
});

it("converte acordes entre colchetes junto às palavras usando posições Unicode", () => {
  const { lyric } = convertPastedLyric(newLyric("[C]Coração [G/B]😊 [Am7]vem"));
  expect(lyric.text).toBe("Coração 😊 vem");
  expect(lyric.chords.map(({ name, offset }) => [name, offset])).toEqual([
    ["C", 0], ["G/B", 8], ["Am7", 10],
  ]);
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
});

it("preserva progressões sem letra e não usa títulos ou tablaturas como letra da cifra", () => {
  const { lyric, converted } = convertPastedLyric(newLyric("C G\nAm F\n\n[Refrão]\nA vida é bonita\nD\nE|--5--|"));
  expect(converted).toBe(5);
  expect(lyric.text).toBe("  \n   \n\n[Refrão]\nA vida é bonita\n\nE|--5--|");
  const rows = splitLyric(lyric);
  expect(rows[0].chords.map(c => c.name)).toEqual(["C", "G"]);
  expect(rows[1].chords.map(c => c.name)).toEqual(["Am", "F"]);
  expect(rows[5].chords[0].name).toBe("D");
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
});

it("não altera letras comuns, cabeçalhos e colchetes que não são acordes", () => {
  const original = newLyric("[Verso]\nA vida é bonita\nE o amor também\nTom: C");
  expect(convertPastedLyric(original)).toEqual({ lyric: original, converted: 0 });
});

it("preserva acordes manuais e os reposiciona após remover texto de cifras", () => {
  const original = newLyric("C       G\nMinha vida\n[Am]Meu amor");
  const manual = { id: uid(), name: "Dm", offset: caretOffset(original.text, original.text.indexOf("vida")) };
  const duplicate = { id: uid(), name: "Am", offset: caretOffset(original.text, original.text.indexOf("Meu")) };
  original.chords = [manual, duplicate];
  const { lyric } = convertPastedLyric(original);
  expect(lyric.text).toBe("Minha vida\nMeu amor");
  expect(lyric.chords.find(c => c.id === manual.id)?.offset).toBe(6);
  expect(lyric.chords.filter(c => c.name === "Am")).toEqual([{ ...duplicate, offset: 11 }]);
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
});

it("mantém acordes além do fim da frase na coluna correta", () => {
  const { lyric } = convertPastedLyric(newLyric("C          G\nOi"));
  expect(lyric.text).toBe("Oi         ");
  expect(lyric.chords.map(c => c.offset)).toEqual([0, 11]);
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
});

it("normaliza quebras de linha e tabulações de texto colado", () => {
  const { lyric } = convertPastedLyric(newLyric("\tC\tG\r\nOlá mundo"));
  expect(lyric.text).toBe("Olá mundo");
  expect(lyric.chords.map(c => c.offset)).toEqual([4, 9]);
  expect(lyricSchema.safeParse(lyric).success).toBe(true);
});

it("converte só a letra de um bloco combinado e desfaz a conversão em uma operação", () => {
  const song = newSong(), combined = newArrangementLyrics();
  combined.lyrics.text = "C      G\nMinha canção";
  song.sections[0].blocks = [combined];
  useEditor.getState().load(song);
  const { lyric } = convertPastedLyric(combined.lyrics);
  useEditor.getState().updateBlock(lyric.id, draft => {
    if (draft.kind === "lyrics") Object.assign(draft, lyric);
  });
  const converted = useEditor.getState().song.sections[0].blocks[0];
  expect(converted.kind).toBe("arrangementLyrics");
  if (converted.kind !== "arrangementLyrics") throw new Error();
  expect(converted.tab).toEqual(combined.tab);
  expect(converted.lyrics.text).toBe("Minha canção");
  expect(converted.lyrics.chords).toHaveLength(2);
  expect(useEditor.getState().past).toHaveLength(1);
  useEditor.getState().undo();
  expect(useEditor.getState().song.sections[0].blocks[0]).toEqual(combined);
  useEditor.getState().redo();
  expect(useEditor.getState().song.sections[0].blocks[0]).toEqual(converted);
});
