import { uid, type Lyric } from "./model";
export const chars = (s: string) => Array.from(s.normalize("NFC"));
// Positions are Unicode code points; DOM carets are converted at the boundary.
export const caretOffset = (s: string, utf16: number) =>
  chars(s.slice(0, utf16)).length;
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
