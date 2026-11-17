import { useEffect } from "react";
import { saveProject } from "../persistence/projects";
import { useRef } from "react";
import type { Song } from "../domain/model";
import { useEditor } from "../store/editor";
let queue = Promise.resolve();
export function persistNow() {
  const state = useEditor.getState(),
    snapshot = structuredClone(state.song),
    revision = state.revision;
  state.setStatus("saving");
  const job = queue.catch(() => {}).then(() => saveProject(snapshot));
  queue = job.then(() => {});
  void queue.catch(() => {});
  return job.then(
    (saved) => {
      const now = useEditor.getState();
      now.acknowledgeSave(saved, revision);
      return saved;
    },
    (error: unknown) => {
      const now = useEditor.getState();
      if (now.song.id === snapshot.id && now.revision === revision)
        now.setStatus(
          "error",
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a música.",
        );
      throw error;
    },
  );
}
export async function flushProject() {
  while (useEditor.getState().status !== "saved") await persistNow();
}
export function usePersistence(
  enabled: boolean,
  onSaved?: (song: Song) => void,
) {
  const handler = useRef(onSaved);
  handler.current = onSaved;
  const { revision, status } = useEditor();
  useEffect(() => {
    if (!enabled || status !== "dirty") return;
    const timer = setTimeout(() => {
      void persistNow()
        .then((saved) => handler.current?.(saved))
        .catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [enabled, revision, status]);
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (["dirty", "saving", "error"].includes(useEditor.getState().status)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
