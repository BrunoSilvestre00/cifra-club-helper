import { uid, type Note, type TabEvent, type Technique } from "./model";
export type FretPosition = Pick<Note, "course" | "fret">;
export function toggleFret(
  positions: FretPosition[],
  position: FretPosition,
): FretPosition[] {
  const same = positions.some(
    (p) => p.course === position.course && p.fret === position.fret,
  );
  const other = positions.filter((p) => p.course !== position.course);
  return same
    ? other
    : [...other, position].sort((a, b) => a.course - b.course);
}
export function selectedEvent(events: TabEvent[], id: string | null) {
  return events.find((e) => e.id === id) ?? events[0];
}
export function eventAfterRemoval(events: TabEvent[], id: string) {
  const index = events.findIndex((e) => e.id === id);
  if (index < 0) return events[0];
  return index > 0 ? events[index - 1] : events[1];
}
export function notesFromPositions(
  positions: FretPosition[],
  technique: Technique,
  target: number,
): Note[] {
  return positions.map((position) => ({
    id: uid(),
    ...position,
    technique,
    ...(["hammer", "pull", "slideUp", "slideDown", "bend"].includes(technique)
      ? { target }
      : {}),
  }));
}
// Returns the event to keep open after a single atomic insertion.
export function addNotes(
  events: TabEvent[],
  notes: Note[],
  selectedId: string | null,
  mode: "sequence" | "simultaneous",
) {
  if (!notes.length) return selectedEvent(events, selectedId)?.id ?? null;
  const current = selectedEvent(events, selectedId);
  if (mode === "simultaneous" && current) {
    const courses = new Set(notes.map((n) => n.course));
    current.notes = [
      ...current.notes.filter((n) => !courses.has(n.course)),
      ...notes,
    ].sort((a, b) => a.course - b.course);
    return current.id;
  }
  const event: TabEvent = { id: uid(), notes, gap: 2, breakBefore: false };
  const index = current
    ? events.findIndex((e) => e.id === current.id) + 1
    : events.length;
  events.splice(index, 0, event);
  return event.id;
}
