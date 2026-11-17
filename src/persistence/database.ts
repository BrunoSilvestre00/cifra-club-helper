import {
  songSchema,
  artistSchema,
  uid,
  type Song,
  type Artist,
} from "../domain/model";
import { slugify } from "../domain/slugs";
import { libraryKey } from "../domain/backup";
export const databaseName = "compasso-projects";
let connection: Promise<IDBDatabase> | undefined;
export const request = <T>(value: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
export async function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  job: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction(stores, mode);
  const finished = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Alteração interrompida."));
  });
  void finished.catch(() => {});
  try {
    const result = await job(tx);
    await finished;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already completed or aborted. */
    }
    await finished.catch(() => {});
    throw error;
  }
}
export function database(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(databaseName, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        const songs = db.objectStoreNames.contains("projects")
          ? req.transaction!.objectStore("projects")
          : db.createObjectStore("projects", { keyPath: "id" });
        if (!songs.indexNames.contains("libraryKey"))
          songs.createIndex("libraryKey", "libraryKey", { unique: true });
        const artists = db.objectStoreNames.contains("artists")
          ? req.transaction!.objectStore("artists")
          : db.createObjectStore("artists", { keyPath: "id" });
        if (!artists.indexNames.contains("slug"))
          artists.createIndex("slug", "slug", { unique: true });
        if (!db.objectStoreNames.contains("settings"))
          db.createObjectStore("settings", { keyPath: "key" });
      };
      req.onerror = () => {
        connection = undefined;
        reject(req.error);
      };
      req.onblocked = () => {
        connection = undefined;
        reject(
          new Error("Feche outras abas antigas do editor e tente novamente."),
        );
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        normalize(db)
          .then(() => resolve(db))
          .catch((error) => {
            db.close();
            connection = undefined;
            reject(error);
          });
      };
    });
  return connection;
}
export async function closeDatabase() {
  const current = connection;
  connection = undefined;
  if (current) (await current).close();
}
async function normalize(db: IDBDatabase) {
  await transact(
    db,
    ["projects", "artists", "settings"],
    "readwrite",
    async (tx) => {
      const settings = tx.objectStore("settings");
      if (await request(settings.get("normalized-v3"))) return;
      const projects = tx.objectStore("projects"),
        artists = tx.objectStore("artists");
      const raw = await request<unknown[]>(projects.getAll());
      const people = (await request<unknown[]>(artists.getAll())).map((a) =>
        artistSchema.parse(a),
      );
      const keys = new Set<string>();
      let invalid = 0;
      for (const value of raw) {
        const parsed = songSchema.safeParse(value);
        if (!parsed.success) {
          invalid++;
          continue;
        }
        const song = parsed.data;
        let person =
          people.find((a) => a.id === song.artistId) ||
          people.find((a) => a.slug === song.artistSlug) ||
          people.find(
            (a) =>
              a.name.toLocaleLowerCase("pt-BR") ===
              song.artist.trim().toLocaleLowerCase("pt-BR"),
          );
        if (!person && song.artist.trim()) {
          let slug = song.artistSlug ?? slugify(song.artist);
          const base = slug;
          for (
            let i = 2;
            people.some((a) => a.slug === slug) || slug === "sem-artista";
            i++
          )
            slug = `${base}-${i}`;
          person = {
            id: uid(),
            name: song.artist.trim(),
            slug,
            createdAt: song.createdAt ?? song.updatedAt,
          };
          people.push(person);
          await request(artists.put(person));
        }
        const normalized: Song = {
          ...song,
          artist: person?.name ?? "",
          artistId: person?.id,
          artistSlug: person?.slug ?? "sem-artista",
          modified_at: song.modified_at ?? song.updatedAt,
          createdAt: song.createdAt ?? song.updatedAt,
          slug: song.slug ?? slugify(song.title),
        };
        const base = normalized.slug!;
        for (let i = 2; keys.has(libraryKey(normalized)); i++)
          normalized.slug = `${base}-${i}`;
        keys.add(libraryKey(normalized));
        await request(
          projects.put({ ...normalized, libraryKey: libraryKey(normalized) }),
        );
      }
      await request(settings.put({ key: "normalized-v3", value: true }));
      await request(settings.put({ key: "invalid-legacy", value: invalid }));
    },
  );
}
export async function ensureArtist(
  tx: IDBTransaction,
  name: string,
  source?: Partial<Artist>,
): Promise<Artist | null> {
  const label = (source?.name ?? name)
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
  if (!label) return null;
  if (label.length > 200)
    throw new Error("O nome do artista deve ter até 200 caracteres.");
  const store = tx.objectStore("artists");
  if (source?.slug) {
    const found = await request<Artist | undefined>(
      store.index("slug").get(source.slug),
    );
    if (found) return artistSchema.parse(found);
  }
  const all = await request<Artist[]>(store.getAll());
  if (!source?.slug) {
    const same = all.find(
      (a) =>
        a.name.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
    );
    if (same) return artistSchema.parse(same);
  }
  let slug = source?.slug ?? slugify(label);
  const base = slug;
  for (
    let i = 2;
    slug === "sem-artista" || all.some((a) => a.slug === slug);
    i++
  )
    slug = `${base}-${i}`;
  const id =
    source?.id && !all.some((a) => a.id === source.id) ? source.id : uid();
  const artist = artistSchema.parse({
    id,
    name: label,
    slug,
    createdAt: source?.createdAt ?? new Date().toISOString(),
  });
  await request(store.put(artist));
  return artist;
}
