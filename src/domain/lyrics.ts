import { uid, type Lyric } from "./model";
export const chars = (s: string) => Array.from(s.normalize("NFC"));
// Positions are Unicode code points; DOM carets are converted at the boundary.
export const caretOffset = (s: string, utf16: number) =>
  chars(s.slice(0, utf16)).length;

const chordName = /^[A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|omit|no|m|M)|[0-9#b()+\-º°øΔ/])*(?:\/[A-G](?:#|b)?)?$/;
const isChord = (value: string) => value.length <= 24 && chordName.test(value);
type PastedChord = { name: string; column: number };

function chordRow(text: string): PastedChord[] | null {
  const tokens = [...text.matchAll(/\S+/gu)];
  if (!tokens.length || tokens.some(([token]) => !isChord(token) && !/^[|:%]+$/.test(token)))
    return null;
  const chords = tokens.filter(([token]) => isChord(token)).map((match) => ({
    name: match[0],
    column: caretOffset(text, match.index),
  }));
  return chords.length ? chords : null;
}

function inlineChords(text: string) {
  const source = chars(text), output: string[] = [], columns: number[] = [];
  const chords: PastedChord[] = [];
  for (let i = 0; i < source.length; i++) {
    columns[i] = output.length;
    if (source[i] === "[") {
      const end = source.indexOf("]", i + 1);
      const name = end < 0 ? "" : source.slice(i + 1, end).join("");
      if (isChord(name)) {
        chords.push({ name, column: output.length });
        while (i < end) columns[++i] = output.length;
        continue;
      }
    }
    output.push(source[i]);
  }
  columns[source.length] = output.length;
  return { text: output.join(""), chords, columns };
}

// Convert only on explicit request. Keep character offsets for existing manual chords.
export function convertPastedLyric(line: Lyric): { lyric: Lyric; converted: number } {
  let sourceBase = 0;
  const source = line.text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").normalize("NFC").split("\n").map((text) => {
    const row = { text, base: sourceBase };
    sourceBase += chars(text).length + 1;
    return row;
  });
  const output: string[] = [], imported: Lyric["chords"] = [];
  const offsets: number[] = [];
  let outputBase = 0;
  const emit = (row: typeof source[number] | null, above: PastedChord[], chordSource?: typeof source[number]) => {
    if (output.length) outputBase++;
    const parsed = inlineChords(row?.text ?? "");
    const chords = [...above, ...parsed.chords];
    const length = Math.max(chars(parsed.text).length, ...chords.map((c) => c.column));
    const text = parsed.text + " ".repeat(length - chars(parsed.text).length);
    if (row) {
      parsed.columns.forEach((column, i) => { offsets[row.base + i] = outputBase + column; });
    }
    if (chordSource) {
      for (let i = 0; i <= chars(chordSource.text).length; i++)
        offsets[chordSource.base + i] = outputBase + Math.min(i, length);
    }
    imported.push(...chords.map((c) => ({ id: uid(), name: c.name, offset: outputBase + c.column })));
    output.push(text);
    outputBase += length;
  };
  for (let i = 0; i < source.length; i++) {
    const row = source[i], above = chordRow(row.text);
    if (!above) {
      emit(row, []);
      continue;
    }
    const next = source[i + 1];
    // Standalone chord progressions keep their own row, as do chords before section headings or tabs.
    if (next && next.text.trim() && !chordRow(next.text) &&
      !/^\s*(?:\[[^\]]+\]\s*$|[A-G][#b]?\s*\|)/.test(next.text)) {
      emit(next, above, row);
      i++;
    } else emit(null, above, row);
  }
  if (!imported.length) return { lyric: line, converted: 0 };
  const chords = line.chords.map((chord) => ({
    ...chord,
    offset: offsets[chord.offset] ?? outputBase,
  }));
  for (const chord of imported) {
    if (!chords.some((existing) => existing.offset === chord.offset && existing.name === chord.name))
      chords.push(chord);
  }
  chords.sort((a, b) => a.offset - b.offset);
  return { lyric: { ...line, text: output.join("\n"), chords }, converted: imported.length };
}
export function reanchorLyric(line: Lyric, value: string): Lyric {
  const old = chars(line.text),
    next = chars(value.replace(/\t/g, "    "));
  let start = 0;
  while (
    start < old.length &&
    start < next.length &&
    old[start] === next[start]
  )
    start++;
  let end = old.length,
    nextEnd = next.length;
  while (end > start && nextEnd > start && old[end - 1] === next[nextEnd - 1]) {
    end--;
    nextEnd--;
  }
  const delta = nextEnd - end;
  const chords = line.chords.map((c) => ({
    ...c,
    offset: Math.min(
      next.length,
      c.offset < start ? c.offset : c.offset >= end ? c.offset + delta : start,
    ),
  }));
  return { ...line, text: next.join(""), chords };
}
export function splitLyric(line: Lyric): Lyric[] {
  let base = 0;
  return line.text.split("\n").map((text, index) => {
    const length = chars(text).length;
    const result: Lyric = {
      id: index === 0 ? line.id : `${line.id}:line:${index}`,
      kind: "lyrics",
      text,
      chords: line.chords
        .filter((c) => c.offset >= base && c.offset <= base + length)
        .map((c) => ({ ...c, offset: c.offset - base })),
    };
    base += length + 1;
    return result;
  });
}
export function editLyric(line: Lyric, value: string): Lyric[] {
  return splitLyric(reanchorLyric(line, value)).map((part, index) => ({
    ...part,
    id: index === 0 ? line.id : uid(),
  }));
}
