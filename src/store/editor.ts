import { create } from "zustand";
import { songElements } from "../domain/blocks";
import {
  newSong,
  type Song,
  type Block,
  type Instrument,
} from "../domain/model";
type Status = "loading" | "dirty" | "saving" | "saved" | "error";
interface Editor {
  song: Song;
  past: Song[];
  future: Song[];
  revision: number;
  status: Status;
  message: string;
  activeSection: string;
  activeBlock: string | null;
  update: (fn: (draft: Song) => void) => void;
  updateBlock: (id: string, fn: (block: Block) => void) => void;
  load: (song: Song) => void;
  undo: () => void;
  redo: () => void;
  select: (section: string, block?: string | null) => void;
  setStatus: (status: Status, message?: string) => void;
  setInstrument: (instrument: Instrument) => void;
  acknowledgeSave: (saved: Song, revision: number) => void;
}
const initial = newSong();
export const useEditor = create<Editor>((set, get) => ({
  song: initial,
  past: [],
  future: [],
  revision: 0,
  status: "loading",
  message: "",
  acknowledgeSave: (saved, revision) =>
    set((state) =>
      state.song.id !== saved.id
        ? state
        : {
            song:
              state.revision === revision
                ? saved
                : {
                    ...state.song,
                    slug: saved.slug,
                    createdAt: saved.createdAt,
                  },
            ...(state.revision === revision
              ? { status: "saved" as const, message: "" }
              : {}),
          },
    ),
  activeSection: initial.sections[0].id,
  activeBlock: initial.sections[0].blocks[0].id,
  update: (fn) =>
    set((state) => {
      const next = structuredClone(state.song);
      fn(next);
      if (JSON.stringify(next) === JSON.stringify(state.song)) return state;
      next.updatedAt = new Date().toISOString();
      next.modified_at = next.updatedAt;
      return {
        song: next,
        past: [...state.past.slice(-99), state.song],
        future: [],
        revision: state.revision + 1,
        status: "dirty",
        message: "",
      };
    }),
  updateBlock: (id, fn) =>
    get().update((s) => {
      const b = songElements(s).find((b) => b.id === id);
      if (b) fn(b);
    }),
  load: (song) =>
    set((state) => ({
      song: structuredClone(song),
      past: [],
      future: [],
      revision: state.revision + 1,
      status: "saved",
      message: "",
      activeSection: song.sections[0].id,
      activeBlock: song.sections[0].blocks[0]?.id ?? null,
    })),
  undo: () =>
    set((state) =>
      state.past.length
        ? {
            song: {
              ...state.past[state.past.length - 1],
              updatedAt: new Date().toISOString(),
              modified_at: new Date().toISOString(),
            },
            past: state.past.slice(0, -1),
            future: [state.song, ...state.future],
            revision: state.revision + 1,
            status: "dirty",
          }
        : state,
    ),
  redo: () =>
    set((state) =>
      state.future.length
        ? {
            song: {
              ...state.future[0],
              updatedAt: new Date().toISOString(),
              modified_at: new Date().toISOString(),
            },
            past: [...state.past, state.song],
            future: state.future.slice(1),
            revision: state.revision + 1,
            status: "dirty",
          }
        : state,
    ),
  select: (activeSection, activeBlock = null) =>
    set({ activeSection, activeBlock }),
  setStatus: (status, message = "") => set({ status, message }),
  setInstrument: (instrument) =>
    get().update((s) => {
      s.instrument = structuredClone(instrument);
    }),
}));
