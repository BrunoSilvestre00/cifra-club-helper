import { z } from "zod";

export const uid = () => crypto.randomUUID();
const id = z.string().min(1).max(100);
const text = z.string().max(10000);
export const blockParts = [
  "Música inteira",
  "Introdução",
  "Verso",
  "Pré-refrão",
  "Refrão",
  "Interlúdio",
  "Solo",
  "Ponte",
  "Final",
] as const;
const part = z.enum(blockParts).optional();
const slug = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const artistSchema = z.object({
  id,
  name: z.string().trim().min(1).max(200),
  slug,
  createdAt: z.string().datetime(),
});
export type Artist = z.infer<typeof artistSchema>;
export const techniques = [
  "none",
  "hammer",
  "pull",
  "slideUp",
  "slideDown",
  "bend",
  "harmonic",
  "vibrato",
] as const;
export const techniqueNames: Record<Technique, string> = {
  none: "Sem técnica",
  hammer: "Hammer-on",
  pull: "Pull-off",
  slideUp: "Slide ↑",
  slideDown: "Slide ↓",
  bend: "Bend",
  harmonic: "Harmônico natural",
  vibrato: "Vibrato",
};
const symbol = z.string().regex(/^[!-~]{1,4}$/);
export const symbolsSchema = z.object({
  hammer: symbol,
  pull: symbol,
  slideUp: symbol,
  slideDown: symbol,
  bend: symbol,
  harmonic: symbol,
  vibrato: symbol,
});
export const defaultSymbols = {
  hammer: "h",
  pull: "p",
  slideUp: "/",
  slideDown: "\\",
  bend: "b",
  harmonic: "<>",
  vibrato: "~",
};
const pitch = z.string().regex(/^[A-G](?:#|b)?[0-8]$/);
export const courseSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(8)
    .regex(/^[^\r\n|]+$/),
  pitches: z.array(pitch).min(1).max(2),
});
export const instrumentSchema = z.object({
  name: z.string().min(1).max(80),
  courses: z.array(courseSchema).min(1).max(12),
});
export const chordSchema = z.object({
  id,
  name: z.string().trim().min(1).max(24).regex(/^\S+$/),
  offset: z.number().int().min(0).max(10000),
});
export const lyricSchema = z
  .object({
    id,
    kind: z.literal("lyrics"),
    name: z.string().max(100).optional(),
    part,
    text: text.refine(
      (t) => !/[\r\t]/.test(t) && t === t.normalize("NFC"),
      "Use caracteres normalizados, sem tabulações",
    ),
    chords: z.array(chordSchema).max(1000),
  })
  .refine(
    (l) => l.chords.every((c) => c.offset <= Array.from(l.text).length),
    "Acorde fora da letra",
  );
export const noteSchema = z
  .object({
    id,
    course: z.number().int().min(0).max(11),
    fret: z.number().int().min(0).max(36),
    technique: z.enum(techniques),
    target: z.number().int().min(0).max(36).optional(),
  })
  .superRefine((n, ctx) => {
    if (
      ["hammer", "pull", "slideUp", "slideDown", "bend"].includes(
        n.technique,
      ) &&
      n.target === undefined
    )
      ctx.addIssue({
        code: "custom",
        message: "Técnica exige casa de destino",
      });
  });
export const eventSchema = z
  .object({
    id,
    notes: z.array(noteSchema).max(12),
    gap: z.number().int().min(1).max(16),
    breakBefore: z.boolean(),
    duration: z.number().positive().optional(),
  })
  .refine(
    (e) => new Set(e.notes.map((n) => n.course)).size === e.notes.length,
    "Uma nota por ordem em cada evento",
  );
export const tabSchema = z.object({
  id,
  kind: z.literal("tab"),
  name: z.string().max(100).optional(),
  part,
  instrument: instrumentSchema.optional(),
  events: z.array(eventSchema).max(5000),
});
export const arrangementLyricsSchema = z.object({
  id,
  kind: z.literal("arrangementLyrics"),
  name: z.string().max(100).optional(),
  part,
  tab: tabSchema,
  lyrics: lyricSchema,
});
export const blockSchema = z.union([
  lyricSchema,
  tabSchema,
  arrangementLyricsSchema,
]);
export const songSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    slug: z
      .string()
      .min(1)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((s) => s !== "new")
      .optional(),
    title: z.string().max(200),
    artist: z.string().max(200),
    artistId: id.optional(),
    artistSlug: slug.optional(),
    key: z.string().max(20),
    instrument: instrumentSchema,
    sections: z
      .array(
        z.object({
          id,
          name: z.string().max(100),
          blocks: z.array(blockSchema).max(1000),
        }),
      )
      .min(1)
      .max(200),
    symbols: symbolsSchema,
    lineWidth: z.number().int().min(40).max(160),
    updatedAt: z.string().datetime(),
    modified_at: z.string().datetime().optional(),
    createdAt: z.string().datetime().optional(),
  })
  .superRefine((song, ctx) => {
    const ids = new Set<string>();
    const check = (value: string) => {
      if (ids.has(value))
        ctx.addIssue({ code: "custom", message: "Identificador duplicado" });
      ids.add(value);
    };
    check(song.id);
    const visit = (b: Block) => {
      check(b.id);
      if (b.kind === "arrangementLyrics") {
        visit(b.tab);
        visit(b.lyrics);
        return;
      }
      if (b.kind === "lyrics") {
        b.chords.forEach((c) => check(c.id));
        return;
      }
      b.events.forEach((e) => {
        check(e.id);
        e.notes.forEach((n) => {
          check(n.id);
          if (n.course >= (b.instrument ?? song.instrument).courses.length)
            ctx.addIssue({
              code: "custom",
              message: "Nota em corda inexistente",
            });
        });
      });
    };
    song.sections.forEach((s) => {
      check(s.id);
      s.blocks.forEach(visit);
    });
  });
export type Song = z.infer<typeof songSchema>;
export type Instrument = z.infer<typeof instrumentSchema>;
export type Lyric = z.infer<typeof lyricSchema>;
export type Tab = z.infer<typeof tabSchema>;
export type TabEvent = z.infer<typeof eventSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Technique = (typeof techniques)[number];
export type ArrangementLyrics = z.infer<typeof arrangementLyricsSchema>;
export type Block = z.infer<typeof blockSchema>;
export const presets: Record<string, Instrument> = {
  guitar: {
    name: "Violão · Padrão",
    courses: ["E4", "B3", "G3", "D3", "A2", "E2"].map((p) => ({
      label: p.slice(0, -1),
      pitches: [p],
    })),
  },
  violaE: {
    name: "Viola · Cebolão em E",
    courses: [
      { label: "E", pitches: ["E4", "E4"] },
      { label: "B", pitches: ["B3", "B3"] },
      { label: "G#", pitches: ["G#3", "G#4"] },
      { label: "E", pitches: ["E3", "E4"] },
      { label: "B", pitches: ["B2", "B3"] },
    ],
  },
  violaDSharp: {
    name: "Viola · Cebolão em D#",
    courses: [
      { label: "D#", pitches: ["D#4", "D#4"] },
      { label: "A#", pitches: ["A#3", "A#3"] },
      { label: "G", pitches: ["G3", "G4"] },
      { label: "D#", pitches: ["D#3", "D#4"] },
      { label: "A#", pitches: ["A#2", "A#3"] },
    ],
  },
  violaD: {
    name: "Viola · Cebolão em D",
    courses: [
      { label: "D", pitches: ["D4", "D4"] },
      { label: "A", pitches: ["A3", "A3"] },
      { label: "F#", pitches: ["F#3", "F#4"] },
      { label: "D", pitches: ["D3", "D4"] },
      { label: "A", pitches: ["A2", "A3"] },
    ],
  },
};
export const newLyric = (text = ""): Lyric => ({
  id: uid(),
  kind: "lyrics",
  text,
  chords: [],
});
export const newTab = (): Tab => ({ id: uid(), kind: "tab", events: [] });
export const newArrangementLyrics = (): ArrangementLyrics => ({
  id: uid(),
  kind: "arrangementLyrics",
  part: "Música inteira",
  tab: newTab(),
  lyrics: newLyric(),
});
export const newSong = (): Song => ({
  schemaVersion: 1,
  id: uid(),
  title: "Nova composição",
  artist: "",
  key: "E",
  instrument: structuredClone(presets.guitar),
  sections: [{ id: uid(), name: "Verso 1", blocks: [newLyric()] }],
  symbols: { ...defaultSymbols },
  lineWidth: 80,
  updatedAt: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});
export function demoSong(): Song {
  const song = newSong();
  song.title = "Caminhos de casa";
  song.artist = "Minha primeira composição";
  const line = newLyric("O vento traz histórias do meu lugar");
  line.chords = [
    { id: uid(), name: "E", offset: 2 },
    { id: uid(), name: "B7", offset: 12 },
    { id: uid(), name: "A", offset: 25 },
  ];
  const line2 = newLyric("E a viola me convida a voltar");
  line2.chords = [
    { id: uid(), name: "E", offset: 0 },
    { id: uid(), name: "A", offset: 13 },
    { id: uid(), name: "B7", offset: 22 },
  ];
  const tab = newTab();
  tab.events = [0, 4, 7, 5].map((fret) => ({
    id: uid(),
    notes: [{ id: uid(), course: 0, fret, technique: "none" }],
    gap: 2,
    breakBefore: false,
  }));
  song.sections = [
    { id: uid(), name: "Introdução", blocks: [tab] },
    { id: uid(), name: "Verso 1", blocks: [line, line2] },
  ];
  return song;
}
