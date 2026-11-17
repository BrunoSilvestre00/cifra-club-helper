import { it, expect } from "vitest";
import {
  newSong,
  newTab,
  uid,
  songSchema,
  presets,
  type TabEvent,
} from "./model";
import {
  toggleFret,
  notesFromPositions,
  addNotes,
  eventAfterRemoval,
  selectedEvent,
} from "./arrangement";
import { useEditor } from "../store/editor";
const event = (fret: number): TabEvent => ({
  id: uid(),
  notes: [{ id: uid(), course: 0, fret, technique: "none" }],
  gap: 2,
  breakBefore: false,
});
it("seleciona cordas diferentes e troca ou desmarca uma posição sem perder as demais", () => {
  let selected = toggleFret([], { course: 0, fret: 5 });
  selected = toggleFret(selected, { course: 2, fret: 7 });
  expect(selected).toHaveLength(2);
  selected = toggleFret(selected, { course: 0, fret: 9 });
  expect(selected).toEqual([
    { course: 0, fret: 9 },
    { course: 2, fret: 7 },
  ]);
  expect(toggleFret(selected, { course: 0, fret: 9 })).toEqual([
    { course: 2, fret: 7 },
  ]);
});
it("confirma um dueto como um único evento e desfaz as duas notas juntas", () => {
  const song = newSong(),
    tab = newTab();
  tab.instrument = presets.violaE;
  song.sections[0].blocks = [tab];
  useEditor.getState().load(song);
  const notes = notesFromPositions(
    [
      { course: 0, fret: 5 },
      { course: 1, fret: 7 },
    ],
    "none",
    0,
  );
  useEditor.getState().updateBlock(tab.id, (block) => {
    if (block.kind === "tab") addNotes(block.events, notes, null, "sequence");
  });
  const block = useEditor.getState().song.sections[0].blocks[0];
  if (block.kind !== "tab") throw new Error();
  expect(block.events).toHaveLength(1);
  expect(block.events[0].notes).toHaveLength(2);
  expect(songSchema.safeParse(useEditor.getState().song).success).toBe(true);
  expect(useEditor.getState().past).toHaveLength(1);
  useEditor.getState().undo();
  const undone = useEditor.getState().song.sections[0].blocks[0];
  if (undone.kind !== "tab") throw new Error();
  expect(undone.events).toHaveLength(0);
});
it("insere todas as notas depois do evento selecionado mantendo a ordem", () => {
  const events = [event(1), event(2)],
    notes = notesFromPositions(
      [
        { course: 0, fret: 12 },
        { course: 4, fret: 0 },
      ],
      "hammer",
      14,
    ),
    first = events[0].id,
    last = events[1].id;
  const id = addNotes(events, notes, first, "sequence");
  expect(events.map((e) => e.id)).toEqual([first, id, last]);
  expect(events[1].notes.map((n) => n.fret)).toEqual([12, 0]);
  expect(events[1].notes.every((n) => n.target === 14)).toBe(true);
});
it("acrescenta posições ao evento existente sem duplicar notas na mesma corda", () => {
  const events = [event(3)],
    id = events[0].id;
  events[0].gap = 6;
  const notes = notesFromPositions(
    [
      { course: 0, fret: 5 },
      { course: 1, fret: 7 },
    ],
    "none",
    0,
  );
  expect(addNotes(events, notes, id, "simultaneous")).toBe(id);
  expect(events).toHaveLength(1);
  expect(events[0].gap).toBe(6);
  expect(events[0].notes.map((n) => [n.course, n.fret])).toEqual([
    [0, 5],
    [1, 7],
  ]);
});
it("seleciona o anterior ao excluir um evento intermediário ou o último", () => {
  const events = [event(1), event(2), event(3)];
  expect(eventAfterRemoval(events, events[1].id)?.id).toBe(events[0].id);
  expect(eventAfterRemoval(events, events[2].id)?.id).toBe(events[1].id);
});
it("seleciona o segundo ao excluir o primeiro e aceita a sequência vazia", () => {
  const events = [event(1), event(2)];
  expect(eventAfterRemoval(events, events[0].id)?.id).toBe(events[1].id);
  expect(eventAfterRemoval([events[0]], events[0].id)).toBeUndefined();
  expect(selectedEvent([], null)).toBeUndefined();
});
it("mantém o primeiro aberto ao entrar ou quando a seleção saiu da sequência", () => {
  const events = [event(1), event(2)];
  expect(selectedEvent(events, null)?.id).toBe(events[0].id);
  expect(selectedEvent(events, "removed")?.id).toBe(events[0].id);
  expect(selectedEvent(events, events[1].id)?.id).toBe(events[1].id);
});
