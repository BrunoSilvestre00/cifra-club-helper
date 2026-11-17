import { it, expect } from "vitest";
import { newSong } from "../domain/model";
import { useEditor } from "./editor";
it("desfaz e refaz alterações estruturadas sem compartilhar mutações", () => {
  const song = newSong();
  useEditor.getState().load(song);
  useEditor.getState().update((s) => {
    s.title = "Alterada";
  });
  expect(song.title).toBe("Nova composição");
  expect(useEditor.getState().song.title).toBe("Alterada");
  useEditor.getState().undo();
  expect(useEditor.getState().song.title).toBe("Nova composição");
  expect(useEditor.getState().status).toBe("dirty");
  useEditor.getState().redo();
  expect(useEditor.getState().song.title).toBe("Alterada");
  useEditor.getState().undo();
  useEditor.getState().update((s) => {
    s.artist = "Outro caminho";
  });
  expect(useEditor.getState().future).toHaveLength(0);
});
