import {
  type Lyric,
  type Song,
  type Note,
  type Instrument,
  type Tab,
  type Block,
  defaultSymbols,
} from "../domain/model";
import { chars, splitLyric } from "../domain/lyrics";
export function layoutLyric(line: Lyric) {
  const letters = chars(line.text);
  const positions: number[] = [];
  const chords = [...line.chords].sort((a, b) => a.offset - b.offset);
  const placed: { id: string; name: string; column: number; offset: number }[] =
    [];
  let column = 0,
    end = -1,
    lyric = "";
  for (let offset = 0; offset <= letters.length; offset++) {
    for (const chord of chords.filter((c) => c.offset === offset)) {
      const at = Math.max(column, end + 1);
      lyric += " ".repeat(at - column);
      column = at;
      placed.push({ ...chord, column: at });
      end = at + chars(chord.name).length;
    }
    positions[offset] = column;
    if (offset < letters.length) {
      lyric += letters[offset];
      column++;
    }
  }
  let chordText = "";
  for (const c of placed)
    chordText += " ".repeat(c.column - chars(chordText).length) + c.name;
  return { lyric, chordText, placed, positions, expanded: lyric !== line.text };
}
export function renderLyric(line: Lyric): string {
  if (line.text.includes("\n"))
    return splitLyric(line).map(renderLyric).join("\n");
  const r = layoutLyric(line);
  return r.chordText ? `${r.chordText}\n${r.lyric}` : r.lyric;
}
export function renderNote(note: Note, symbols = defaultSymbols) {
  const fret = String(note.fret);
  if (note.technique === "none") return fret;
  if (note.technique === "harmonic")
    return symbols.harmonic === "<>"
      ? `<${fret}>`
      : `${fret}${symbols.harmonic}`;
  const destination = [
    "hammer",
    "pull",
    "slideUp",
    "slideDown",
    "bend",
  ].includes(note.technique)
    ? (note.target ?? "")
    : "";
  return `${fret}${symbols[note.technique]}${destination}`;
}
export function renderTab(
  tab: Tab,
  instrument: Instrument,
  width = 80,
  symbols = defaultSymbols,
): string {
  const labels = instrument.courses.map((c) => c.label);
  const labelWidth = Math.max(...labels.map((l) => chars(l).length));
  const prefix = labelWidth + 1;
  const groups: string[][] = [];
  let rows = labels.map(() => "--"),
    used = false;
  const flush = () => {
    if (used) groups.push(rows);
    rows = labels.map(() => "--");
    used = false;
  };
  for (const event of tab.events) {
    const cells = labels.map((_, course) => {
      const n = event.notes.find((n) => n.course === course);
      return n ? renderNote(n, symbols) : "";
    });
    const size = Math.max(1, ...cells.map((c) => chars(c).length)) + event.gap;
    if (
      (event.breakBefore || prefix + rows[0].length + size + 1 > width) &&
      used
    )
      flush();
    rows = rows.map(
      (row, i) => row + cells[i] + "-".repeat(size - chars(cells[i]).length),
    );
    used = true;
  }
  if (used || !groups.length) groups.push(rows);
  return groups
    .map((group) =>
      group
        .map((row, i) => labels[i].padEnd(labelWidth) + "|" + row + "|")
        .join("\n"),
    )
    .join("\n\n");
}
export function songSegments(song: Song) {
  return song.sections.flatMap((section) =>
    section.blocks.map((block, index) => ({
      section,
      block,
      heading: block.part
        ? block.part === "Introdução"
          ? "Intro"
          : block.part
        : index === 0 && section.name !== "Música"
          ? section.name
          : null,
    })),
  );
}
export function renderSong(song: Song) {
  return [
    song.key ? `Tom: ${song.key}` : "",
    ...songSegments(song).map(
      ({ block, heading }) =>
        (heading ? `[${heading}]\n\n` : "") + renderBlock(block, song),
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function renderBlock(block: Block, song: Song): string {
  if (block.kind === "lyrics") return renderLyric(block);
  if (block.kind === "tab")
    return renderTab(
      block,
      block.instrument ?? song.instrument,
      song.lineWidth,
      song.symbols,
    );
  return [renderBlock(block.tab, song), renderLyric(block.lyrics)]
    .filter((text) => text.trim())
    .join("\n\n");
}
