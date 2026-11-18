import { uid, type Note, type TabEvent, type Technique } from "./model";
export type FretPosition = Pick<Note, "course" | "fret">;
export type DraftPosition = FretPosition &
  Partial<Pick<Note, "technique" | "target">>;
export const techniqueTools = {
  none: "Sem técnica",
  slide: "Slide",
  legato: "Hammer-on / Pull-off",
  bend: "Bend",
  harmonic: "Harmônico natural",
  vibrato: "Vibrato",
} as const;
export type TechniqueTool = keyof typeof techniqueTools;
export function toolForTechnique(technique: Technique): TechniqueTool {
  if (technique === "slideUp" || technique === "slideDown") return "slide";
  if (technique === "hammer" || technique === "pull") return "legato";
  return technique;
}
export function techniqueBetween(
  tool: TechniqueTool,
  fret: number,
  target?: number,
): Technique {
  if (tool === "slide" || tool === "legato") {
    if (target === undefined || target === fret) return "none";
    if (tool === "slide") return target > fret ? "slideUp" : "slideDown";
    return target > fret ? "hammer" : "pull";
  }
  return tool;
}
// Each course keeps its own starting position, destination and technique until commit.
export function selectFret(
  positions: DraftPosition[],
  position: FretPosition,
  tool: TechniqueTool,
): DraftPosition[] {
  const current = positions.find((p) => p.course === position.course);
  const other = positions.filter((p) => p.course !== position.course);
  const needsTarget = ["slide", "legato", "bend"].includes(tool);
  let next: DraftPosition | undefined;
  if (needsTarget && current) {
    const clear = current.fret === position.fret ||
      (current.target === position.fret &&
        toolForTechnique(current.technique ?? "none") === tool);
    next = clear
      ? { course: current.course, fret: current.fret, technique: "none" }
      : {
          ...current,
          target: position.fret,
          technique: techniqueBetween(tool, current.fret, position.fret),
        };
  } else if (
    current?.fret !== position.fret ||
    (current.technique ?? "none") !== tool
  ) {
    next = {
      ...position,
      technique: needsTarget ? "none" : techniqueBetween(tool, position.fret),
    };
  }
  return (next ? [...other, next] : other).sort((a, b) => a.course - b.course);
}
export function selectedEvent(events: TabEvent[], id: string | null) {
  return events.find((e) => e.id === id) ?? events[0];
}
export function eventAfterRemoval(events: TabEvent[], id: string) {
  const index = events.findIndex((e) => e.id === id);
  if (index < 0) return events[0];
  return index > 0 ? events[index - 1] : events[1];
}
export function notesFromPositions(positions: DraftPosition[]): Note[] {
  return positions.map((position) => ({
    id: uid(),
    ...position,
    technique: position.technique ?? "none",
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
