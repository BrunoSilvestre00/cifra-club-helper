import { uid, type Block, type Song, type Instrument, type Tab } from "./model";
export function blockPart(block: Block): string {
  if (block.part) return block.part;
  const value = block.name?.toLocaleLowerCase("pt-BR") ?? "";
  if (/intro|início|inicio/.test(value)) return "Introdução";
  if (/pr[eé].*refr/.test(value)) return "Pré-refrão";
  if (/refr/.test(value)) return "Refrão";
  if (/solo/.test(value)) return "Solo";
  if (/ponte/.test(value)) return "Ponte";
  if (/final/.test(value)) return "Final";
  if (/inter/.test(value)) return "Interlúdio";
  if (block.kind === "arrangementLyrics") return "Música inteira";
  return block.kind === "tab" ? "Introdução" : "Verso";
}

export function duplicateBlock(block: Block): Block {
  const copy = structuredClone(block);
  copy.name = block.name ? `${block.name.slice(0, 90)} (cópia)` : undefined;
  const renew = (element: Block) => {
    element.id = uid();
    if (element.kind === "arrangementLyrics") {
      renew(element.tab);
      renew(element.lyrics);
    } else if (element.kind === "lyrics")
      element.chords.forEach((c) => {
        c.id = uid();
      });
    else
      element.events.forEach((e) => {
        e.id = uid();
        e.notes.forEach((n) => {
          n.id = uid();
        });
      });
  };
  renew(copy);
  return copy;
}
export function songElements(song: Song): Block[] {
  return song.sections.flatMap((s) =>
    s.blocks.flatMap((b) =>
      b.kind === "arrangementLyrics" ? [b, b.tab, b.lyrics] : [b],
    ),
  );
}
export function blockKindLabel(block: Block) {
  return block.kind === "arrangementLyrics"
    ? "Arranjo com letra"
    : block.kind === "tab"
      ? "Arranjo"
      : "Letra";
}
// targetId means insert before that block; null appends to the section.
export function moveBlock(
  song: Song,
  blockId: string,
  targetSectionId: string,
  targetId: string | null,
) {
  if (blockId === targetId) return;
  const from = song.sections.find((s) =>
    s.blocks.some((b) => b.id === blockId),
  );
  const to = song.sections.find((s) => s.id === targetSectionId);
  if (
    !from ||
    !to ||
    (targetId !== null && !to.blocks.some((b) => b.id === targetId))
  )
    return;
  const [block] = from.blocks.splice(
    from.blocks.findIndex((b) => b.id === blockId),
    1,
  );
  to.blocks.splice(
    targetId === null
      ? to.blocks.length
      : to.blocks.findIndex((b) => b.id === targetId),
    0,
    block,
  );
}
export function canUseInstrument(tab: Tab, instrument: Instrument) {
  return tab.events.every((e) =>
    e.notes.every((n) => n.course < instrument.courses.length),
  );
}
export function instrumentType(instrument: Instrument): "guitar" | "viola" {
  return instrument.courses.some((c) => c.pitches.length === 2)
    ? "viola"
    : "guitar";
}
