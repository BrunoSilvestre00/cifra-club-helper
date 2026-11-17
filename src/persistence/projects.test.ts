import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import {
  newSong,
  newLyric,
  newArrangementLyrics,
  uid,
  type Song,
} from "../domain/model";
import {
  saveProject,
  listProjects,
  deleteProject,
  createArtist,
  listArtists,
  exportLibrary,
  importLibrary,
  importProject,
} from "./projects";
import { closeDatabase, databaseName, request } from "./database";
import { parseLibrary, libraryKey, type LibraryBackup } from "../domain/backup";
beforeEach(async () => {
  await closeDatabase();
  await request(indexedDB.deleteDatabase(databaseName));
});
const backup = (songs: Song[]): LibraryBackup => ({
  format: "cifra-club-helper-library",
  version: 1,
  exportedAt: new Date().toISOString(),
  artists: [],
  songs,
});
it("salva no navegador, reabre, edita e exclui sem servidor", async () => {
  const artist = await createArtist("Nenem e Manuelzito"),
    song = await saveProject({
      ...newSong(),
      title: "Minha música",
      artist: artist.name,
      artistId: artist.id,
    });
  await closeDatabase();
  expect((await listProjects())[0].title).toBe("Minha música");
  const changed = await saveProject({
    ...song,
    title: "Nome novo",
    createdAt: "2000-01-01T00:00:00.000Z",
  });
  expect(changed.slug).toBe(song.slug);
  expect(changed.createdAt).toBe(song.createdAt);
  await deleteProject(song.id);
  expect(await listProjects()).toHaveLength(0);
  expect(await listArtists()).toHaveLength(1);
});
it("usa artista + música como chave dupla e permite a mesma música de artistas diferentes", async () => {
  const a = await createArtist("Artista A"),
    b = await createArtist("Artista B");
  expect((await createArtist("artista a")).id).toBe(a.id);
  const first = await saveProject({
    ...newSong(),
    title: "Casa",
    artist: a.name,
    artistId: a.id,
  });
  await expect(
    saveProject({
      ...newSong(),
      title: "Casa",
      artist: a.name,
      artistId: a.id,
    }),
  ).rejects.toThrow("Já existe");
  const other = await saveProject({
    ...newSong(),
    title: "Casa",
    artist: b.name,
    artistId: b.id,
  });
  expect(other.slug).toBe(first.slug);
  expect(libraryKey(other)).not.toBe(libraryKey(first));
  expect(await listProjects()).toHaveLength(2);
});
it("exporta a biblioteca completa ou somente as músicas e artistas selecionados", async () => {
  const a = await createArtist("Artista A"),
    b = await createArtist("Artista B");
  await createArtist("Artista sem músicas");
  const first = await saveProject({
    ...newSong(),
    title: "Primeira",
    artist: a.name,
    artistId: a.id,
  });
  await saveProject({
    ...newSong(),
    title: "Segunda",
    artist: b.name,
    artistId: b.id,
  });
  const selection = await exportLibrary([first.id]);
  expect(selection.songs).toHaveLength(1);
  expect(selection.artists.map((a) => a.id)).toEqual([a.id]);
  const all = await exportLibrary();
  expect(all.songs).toHaveLength(2);
  expect(all.artists).toHaveLength(3);
  expect(parseLibrary(JSON.stringify(all))).toEqual(all);
});
it("restaura várias músicas e um bloco combinado em outro navegador", async () => {
  const artist = await createArtist("Meu artista"),
    first = newSong();
  first.sections[0].blocks = [newArrangementLyrics()];
  await saveProject({
    ...first,
    title: "Primeira",
    artist: artist.name,
    artistId: artist.id,
  });
  await saveProject({
    ...newSong(),
    title: "Segunda",
    artist: artist.name,
    artistId: artist.id,
  });
  const exported = await exportLibrary();
  await closeDatabase();
  await request(indexedDB.deleteDatabase(databaseName));
  expect(await importLibrary(JSON.stringify(exported))).toEqual({
    imported: 2,
    updated: 0,
    skipped: 0,
  });
  expect(
    (await listProjects()).some(
      (s) => s.sections[0].blocks[0].kind === "arrangementLyrics",
    ),
  ).toBe(true);
  expect(await listArtists()).toHaveLength(1);
});
it("detecta duplicata por slugs mesmo com IDs diferentes e só atualiza quando solicitado", async () => {
  const original = await saveProject({
      ...newSong(),
      title: "Casa",
      artist: "Artista",
    }),
    incoming = {
      ...original,
      id: uid(),
      title: "Versão do backup",
      sections: [
        { ...original.sections[0], blocks: [newLyric("Letra importada")] },
      ],
    };
  expect(await importLibrary(backup([incoming]))).toEqual({
    imported: 0,
    updated: 0,
    skipped: 1,
  });
  expect((await listProjects())[0].title).toBe("Casa");
  expect(
    await importLibrary(backup([incoming]), { replaceExisting: true }),
  ).toEqual({ imported: 0, updated: 1, skipped: 0 });
  const restored = (await listProjects())[0];
  expect(restored.id).toBe(original.id);
  expect(restored.title).toBe("Versão do backup");
});
it("detecta repetidas dentro do arquivo e evita colisão de IDs entre músicas diferentes", async () => {
  const existing = await saveProject({ ...newSong(), title: "Original" }),
    incoming = { ...newSong(), id: existing.id, title: "Nova", slug: "nova" };
  const result = await importLibrary(
    backup([incoming, { ...incoming, id: uid() }]),
  );
  expect(result).toEqual({ imported: 1, updated: 0, skipped: 1 });
  const songs = await listProjects();
  expect(songs).toHaveLength(2);
  expect(new Set(songs.map((s) => s.id)).size).toBe(2);
  expect(
    songs.some((s) => s.id === existing.id && s.title === "Original"),
  ).toBe(true);
});
it("valida a biblioteca inteira antes de alterar qualquer música", async () => {
  await saveProject(newSong());
  const invalid = {
    ...backup([newSong()]),
    songs: [newSong(), { schemaVersion: 99 }],
  };
  await expect(importLibrary(JSON.stringify(invalid))).rejects.toThrow(
    "inválido",
  );
  expect(await listProjects()).toHaveLength(1);
  expect(() => importProject('{"schemaVersion":99}')).toThrow(
    "Projeto inválido",
  );
  expect(() => parseLibrary("x".repeat(50_000_001))).toThrow("50 MB");
});
it("migra IndexedDB antigo preservando os projetos e distinguindo slugs duplicados", async () => {
  const old = newSong(),
    second = { ...newSong(), title: old.title, artist: old.artist };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(databaseName, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("projects", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(old);
    tx.objectStore("projects").put(second);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const songs = await listProjects();
  expect(songs).toHaveLength(2);
  expect(new Set(songs.map((song) => libraryKey(song))).size).toBe(2);
  expect(songs.some((s) => s.id === old.id)).toBe(true);
});
